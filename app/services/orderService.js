import Debug from 'debug';
import { graphqlRequest, gqlEscape } from './graphqlService';
import {
    ADD_ORDER_TO_TERMINAL_TICKET,
    CREATE_TERMINAL_TICKET,
    GET_OPEN_TICKETS,
    GET_TERMINAL_TICKET,
    LOAD_TERMINAL_TICKET
} from '../graphql/queries';

const debug = Debug('pmpos:order');

/**
 * Servicio de órdenes simplificado que usa solo los métodos que funcionan
 * en los smoke tests (inline GraphQL sin Apollo Client)
 */
export const orderService = {
    /**
     * Añade una nueva orden al ticket del terminal
     * Implementa el flujo correcto para mesa libre según documentación SambaPOS
     * Ahora soporta orderTags para aplicación automática después de crear la orden
     */
    async addOrder(terminalId, productName, quantity = 1, portion = null, tableId = null, skipTicketReload = false, orderTags = [], quickSale = false) {
        console.log('➕ [orderService] Adding order (mesa libre flow):', { terminalId, productName, quantity, portion, tableId, skipTicketReload, orderTags: orderTags?.length || 0 });
        debug('➕ Adding order (mesa libre flow):', { terminalId, productName, quantity, portion, tableId, skipTicketReload, orderTags });

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }
        if (!productName) {
            throw new Error('Product name is required');
        }

        const useQuickSale = !!quickSale;
        if (!useQuickSale && !tableId) {
            throw new Error('tableId is required for mesa libre flow');
        }

        try {
            if (!useQuickSale) {
                console.log('🔍 [orderService] Checking for OPEN tickets for table:', tableId);
                debug('🔍 Checking for open tickets for table:', tableId);

                const openTicketsResult = await graphqlRequest(GET_OPEN_TICKETS);
                console.log('📋 [orderService] All open tickets:', openTicketsResult?.getTickets?.length || 0);
                debug('📋 All open tickets count:', openTicketsResult?.getTickets?.length || 0);

                const openTickets = openTicketsResult?.getTickets || [];
                const tableTicket = openTickets.find(ticket =>
                    ticket.entities?.some(entity =>
                        entity.type === "Mesas" && entity.name === String(tableId)
                    )
                );

                console.log('🎫 [orderService] Table ticket found:', tableTicket ? `ID: ${tableTicket.id}, remaining: ${tableTicket?.remainingAmount}` : 'none');
                debug('🎫 Table ticket state:', tableTicket);

                const hasActiveTableTicket = tableTicket !== null &&
                    tableTicket?.remainingAmount !== undefined &&
                    tableTicket?.remainingAmount > 0;

                console.log('💰 [orderService] Table ticket validation:', {
                    hasTicket: tableTicket !== null,
                    remainingAmount: tableTicket?.remainingAmount,
                    hasActiveTableTicket
                });

                if (!hasActiveTableTicket) {
                    if (tableTicket && tableTicket?.remainingAmount === 0) {
                        console.log('💳 [orderService] Found paid ticket for table, ignoring for new order:', {
                            id: tableTicket.id,
                            totalAmount: tableTicket?.totalAmount,
                            remainingAmount: tableTicket?.remainingAmount
                        });
                    }

                    console.log('🆕 [orderService] No open ticket found for table, creating new ticket for mesa libre...');
                    debug('🆕 Creating new ticket for mesa libre flow...');

                    const newTicket = await graphqlRequest(CREATE_TERMINAL_TICKET, { terminalId });
                    console.log('✅ [orderService] New ticket created for mesa libre:', newTicket);
                    debug('✅ New ticket created for mesa libre:', newTicket);

                    if (tableId) {
                        console.log('🏠 [orderService] Assigning table to new ticket:', { tableId, terminalId });
                        debug('🏠 Assigning table to new ticket:', { tableId, terminalId });
                        try {
                            const { ticketService } = await import('./ticketService');
                            await ticketService.changeEntityOfTerminalTicket(terminalId, String(tableId), "Mesas");
                            debug('✅ Table assigned to ticket successfully');
                        } catch (assignError) {
                            debug('❌ Failed to assign table to ticket:', assignError.message);
                            throw new Error(`Failed to assign table ${tableId} to ticket: ${assignError.message}`);
                        }
                    } else {
                        console.log('⚠️ [orderService] No tableId provided, ticket created without table assignment');
                        debug('⚠️ No tableId provided, ticket created without table assignment');
                        throw new Error('tableId is required for mesa libre flow');
                    }

                    console.log('� [orderService] Verifying new ticket was created...');
                    const verifyTicketQuery = `query { getTerminalTicket(terminalId: "${terminalId}") { id number totalAmount remainingAmount } }`;
                    const verifiedTicketState = await graphqlRequest(verifyTicketQuery);
                    console.log('✅ [orderService] Verified new ticket state:', verifiedTicketState);
                    debug('✅ Verified new ticket state:', verifiedTicketState);

                } else {
                    if (!tableTicket || !tableTicket.id) {
                        console.error('❌ [orderService] Critical error: tableTicket is invalid:', tableTicket);
                        debug('❌ Critical error: invalid tableTicket in active flow:', tableTicket);
                        throw new Error('Invalid table ticket state - cannot proceed with order');
                    }

                    console.log('📋 [orderService] Using existing ACTIVE table ticket:', {
                        id: tableTicket.id,
                        number: tableTicket.number,
                        totalAmount: tableTicket.totalAmount,
                        remainingAmount: tableTicket?.remainingAmount
                    });
                    debug('📋 Using existing active table ticket:', tableTicket);

                    if (!skipTicketReload) {
                        console.log('📥 [orderService] Loading existing ticket into terminal (required step):', tableTicket.id);
                        debug('📥 Loading existing ticket into terminal:', tableTicket.id);

                        const loadedTicket = await graphqlRequest(LOAD_TERMINAL_TICKET, {
                            terminalId,
                            ticketId: String(tableTicket.id)
                        });
                        console.log('✅ [orderService] Existing ticket loaded into terminal:', loadedTicket?.loadTerminalTicket);
                        debug('✅ Existing ticket loaded into terminal:', loadedTicket?.loadTerminalTicket);

                        if (!loadedTicket?.loadTerminalTicket) {
                            throw new Error(`Failed to load existing ticket ${tableTicket.id} into terminal ${terminalId}`);
                        }
                    } else {
                        console.log('⚡ [orderService] OPTIMIZATION: Skipping ticket reload to preserve existing orders in terminal');
                        debug('⚡ OPTIMIZATION: Skipping ticket reload for batch order processing');
                    }
                }
            } else {
                console.log('⚡ [orderService] Quick sale flow detected - ensuring terminal ticket without table');
                debug('⚡ Quick sale flow detected - ensuring terminal ticket without table');
                await this.ensureQuickSaleTicket(terminalId);
            }

            // 3. Ahora proceder con agregar la orden al ticket activo (ya cargado en terminal)
            console.log('🍽️ [orderService] Adding order to active ticket...');
            console.log('🔍 [orderService] About to add order - debug checkpoint A');
            const finalPortion = portion && typeof portion === 'string' && portion.trim() ? portion.trim() : 'Normal';

            const vars = {
                terminalId: String(terminalId),
                productName: String(productName),
                quantity: parseFloat(quantity) || 1,
                portion: finalPortion
            };

            console.log('📊 [orderService] Order variables:', vars);
            console.log('🔍 [orderService] About to add order - debug checkpoint B');
            debug('🔍 Final variables for GraphQL (by name):', vars);

            // Usar mutación con formato EXACTO de la documentación SambaPOS
            console.log('📤 [orderService] Sending addOrderToTerminalTicket mutation...');
            debug('🔍 Mutation variables being sent:', vars);
            const result = await graphqlRequest(ADD_ORDER_TO_TERMINAL_TICKET, vars);
            console.log('📥 [orderService] GraphQL response received:', result);
            debug('🔍 GraphQL response received:', result);

            if (result?.addOrderToTerminalTicket) {
                console.log('✅ [orderService] Order added successfully to kitchen!', result.addOrderToTerminalTicket);
                debug('✅ Order added successfully:', result.addOrderToTerminalTicket);

                // CRITICAL FIX: Apply order tags if provided
                if (orderTags && Array.isArray(orderTags) && orderTags.length > 0) {
                    console.log('🏷️ [orderService] Applying order tags after order creation:', orderTags.length);
                    debug('🏷️ Applying order tags:', orderTags);

                    try {
                        // First, get the terminal ticket to find the UID of the just-created order
                        const ticketResult = await graphqlRequest(GET_TERMINAL_TICKET, { terminalId });

                        // Find the order we just created (match by name and portion)
                        const orders = ticketResult?.getTerminalTicket?.orders || [];
                        const targetOrder = orders.find(o =>
                            (o?.name || '').toLowerCase() === productName.toLowerCase() &&
                            (o?.portion || 'Normal') === (portion || 'Normal')
                        );

                        if (targetOrder?.uid) {
                            console.log('🎯 [orderService] Found target order UID for tagging:', targetOrder.uid);

                            // Import and use the applyOrderTagsToTerminalTicketAsync function
                            const { applyOrderTagsToTerminalTicketAsync } = await import('../queries');

                            // Convert orderTags to expected format
                            const formattedTags = orderTags.map(tag => ({
                                tagName: tag.name || tag.tagName || 'CUSTOM',
                                tag: tag.value || tag.tag || tag.name || '',
                                price: parseFloat(tag.price) || 0
                            }));

                            const tagResult = await applyOrderTagsToTerminalTicketAsync(
                                terminalId,
                                targetOrder.uid,
                                formattedTags
                            );

                            console.log('✅ [orderService] Order tags applied successfully:', tagResult);
                            debug('✅ Order tags applied:', tagResult);
                        } else {
                            console.warn('⚠️ [orderService] Could not find order UID for tag application');
                            debug('⚠️ Could not find order UID for tags, orders found:', orders.map(o => ({ name: o.name, portion: o.portion })));
                        }
                    } catch (tagError) {
                        console.error('❌ [orderService] Failed to apply order tags:', tagError.message);
                        debug('❌ Tag application failed:', tagError);
                        // Don't fail the entire order if tags fail - log and continue
                    }
                }

                return { success: true, order: result.addOrderToTerminalTicket };
            } else {
                console.error('❌ [orderService] Kitchen submission failed - no addOrderToTerminalTicket in response:', Object.keys(result || {}));
                debug('❌ No addOrderToTerminalTicket in response:', Object.keys(result || {}));
                throw new Error('Kitchen submission failed - no response from addOrderToTerminalTicket');
            }
        } catch (error) {
            console.error('❌ [orderService] Failed to add order:', error.message);
            debug('❌ Failed to add order:', error.message);
            // Enhanced error message with debugging info
            throw new Error(`Error al agregar orden: ${error.message} (Product: ${productName}, Portion: ${portion || 'Normal'})`);
        }
    },

    async ensureQuickSaleTicket(terminalId) {
        try {
            const { ticketService } = await import('./ticketService');
            const existingTicket = await ticketService.getTerminalTicket(terminalId).catch(() => null);
            if (!existingTicket) {
                await ticketService.createTerminalTicket(terminalId);
                debug('✅ Quick sale ticket created for terminal:', terminalId);
            } else {
                debug('✅ Quick sale ticket already present for terminal:', terminalId);
            }
        } catch (error) {
            debug('⚠️ ensureQuickSaleTicket fallback:', error?.message || error);
            const { ticketService } = await import('./ticketService');
            await ticketService.createTerminalTicket(terminalId);
        }
    },

    /**
     * Consulta el estado de las mesas (libre/ocupada)
     * Basado en la documentación: getEntityScreenItems(name: "MESAS")
     */
    async getTableStatus() {
        debug('🏠 Checking table status...');

        try {
            const query = `query {
                getEntityScreenItems(name: "MESAS") {
                    name
                    caption
                    color
                    labelColor
                }
            }`;
            const result = await graphqlRequest(query);

            if (result?.getEntityScreenItems) {
                const tables = result.getEntityScreenItems.map(table => ({
                    number: table.name,
                    caption: table.caption,
                    // Una mesa está ocupada si tiene un color distinto al default (#E5E3D8)
                    isOccupied: table.color !== "#E5E3D8",
                    color: table.color
                }));

                debug('🏠 Table status:', tables);
                return tables;
            } else {
                throw new Error('No table data found');
            }
        } catch (error) {
            debug('❌ Failed to get table status:', error.message);
            throw error;
        }
    },

    /**
     * Consulta tickets abiertos para verificar qué mesas están ocupadas
     * Complementa la información de getEntityScreenItems
     */
    async getOpenTickets() {
        debug('📋 Checking open tickets...');

        try {
            const query = `query {
                getTickets(isClosed: false, orderBy: date) {
                    id
                    number
                    date
                    totalAmount
                    remainingAmount
                    entities { type name }
                    orders { id uid menuItemName date portion quantity price }
                    states { stateName state }
                }
            }`;
            const result = await graphqlRequest(query);

            if (result?.getTickets) {
                debug('📋 Open tickets:', result.getTickets);
                return result.getTickets;
            } else {
                debug('📋 No open tickets found');
                return [];
            }
        } catch (error) {
            debug('❌ Failed to get open tickets:', error.message);
            throw error;
        }
    },

    /**
     * Prueba con el producto exacto de la documentación SambaPOS
     */
    async testDocumentationFlow(terminalId, tableId) {
        debug('🧪 Testing exact documentation flow...');

        try {
            // Usar el producto exacto de la documentación: "CUARTO POLLO"
            const result = await this.addOrder(terminalId, "CUARTO POLLO", 3, "Normal", tableId);
            debug('✅ Documentation flow test successful:', result);
            return result;
        } catch (error) {
            debug('❌ Documentation flow test failed:', error.message);
            throw error;
        }
    },

    /**
     * Valida que un producto existe en el menú
     */
    async validateProductExists(productName) {
        debug('🔍 Validating product exists:', productName);

        try {
            const query = `query { getProducts { name portions { name } } }`;
            const result = await graphqlRequest(query);

            if (result?.getProducts) {
                const product = result.getProducts.find(p => p.name === productName);
                if (!product) {
                    throw new Error(`Product "${productName}" not found in menu`);
                }
                debug('✅ Product found:', { name: product.name, portions: product.portions?.map(p => p.name) });
                return product;
            } else {
                throw new Error('No products found in menu');
            }
        } catch (error) {
            debug('❌ Product validation failed:', error.message);
            throw error;
        }
    },

    /**
     * Diagnóstico completo del problema addOrderToTerminalTicket
     */
    async diagnoseAddOrderProblem(terminalId, productName = 'CAFE AMERICANO', productId = 910) {
        console.group('🔬 DIAGNÓSTICO COMPLETO - addOrderToTerminalTicket');

        try {
            // 1. Verificar terminal registration status
            console.log('🔍 1. Verificando status del terminal...');
            try {
                const terminalQuery = `query { getTerminalTicket(terminalId: "${terminalId}") { id number totalAmount } }`;
                const terminalResult = await graphqlRequest(terminalQuery);
                console.log('✅ Terminal status:', terminalResult);
            } catch (terminalError) {
                console.error('❌ Terminal check failed:', terminalError.message);
            }

            // 2. Verificar conectividad básica con una query simple
            console.log('🔍 2. Verificando conectividad GraphQL básica...');
            try {
                const simpleQuery = `query { __type(name: "Query") { name } }`;
                const connectivityResult = await graphqlRequest(simpleQuery);
                console.log('✅ Conectividad GraphQL OK:', connectivityResult);
            } catch (connectivityError) {
                console.error('❌ Conectividad GraphQL falló:', connectivityError.message);
            }

            // 3. Verificar schema de mutations
            console.log('🔍 3. Verificando esquema de mutations...');
            try {
                const schemaQuery = `query { __type(name: "Mutation") { fields { name args { name type { name } } } } }`;
                const schemaResult = await graphqlRequest(schemaQuery);
                const addOrderMutation = schemaResult?.__type?.fields?.find(f => f.name === 'addOrderToTerminalTicket');
                console.log('✅ addOrderToTerminalTicket en schema:', addOrderMutation);
            } catch (schemaError) {
                console.error('❌ Schema check failed:', schemaError.message);
            }

            // 4. Probar mutation más simple para verificar permisos
            console.log('🔍 4. Probando mutation simple...');
            try {
                // Intentar cerrar y reabrir el terminal ticket como test
                const testQuery = `query { getTerminalTicket(terminalId: "${terminalId}") { id totalAmount remainingAmount } }`;
                const testResult = await graphqlRequest(testQuery);
                console.log('✅ Read operation OK:', testResult);
            } catch (testError) {
                console.error('❌ Read operation failed:', testError.message);
            }

            // 5. Verificar el producto específico
            console.log('🔍 5. Verificando producto específico...');
            try {
                const productQuery = `query { getProducts { id name portions { id name } } }`;
                const productsResult = await graphqlRequest(productQuery);
                const targetProduct = productsResult?.getProducts?.find(p => p.id == productId || p.name === productName);
                console.log('✅ Producto encontrado:', targetProduct);
            } catch (productError) {
                console.error('❌ Product check failed:', productError.message);
            }

            // 6. Intentar mutation con datos mínimos
            console.log('🔍 6. Probando mutation con datos mínimos...');
            try {
                const minimalMutation = `
                    mutation {
                        addOrderToTerminalTicket(
                            terminalId: "${terminalId}",
                            productId: ${productId},
                            quantity: 1,
                            portion: "Normal"
                        ) {
                            totalAmount
                        }
                    }
                `;
                console.log('Sending minimal mutation:', minimalMutation);
                const minimalResult = await graphqlRequest(minimalMutation);
                console.log('✅ Minimal mutation SUCCESS:', minimalResult);
                return { success: true, result: minimalResult };
            } catch (minimalError) {
                console.error('❌ Minimal mutation failed:', minimalError);

                // 7. Intentar con productName en lugar de productId
                console.log('🔍 7. Probando con productName...');
                try {
                    const nameBasedMutation = `
                        mutation {
                            addOrderToTerminalTicket(
                                terminalId: "${terminalId}",
                                productName: "${productName}",
                                quantity: 1,
                                portion: "Normal"
                            ) {
                                totalAmount
                            }
                        }
                    `;
                    console.log('Sending name-based mutation:', nameBasedMutation);
                    const nameResult = await graphqlRequest(nameBasedMutation);
                    console.log('✅ Name-based mutation SUCCESS:', nameResult);
                    return { success: true, result: nameResult };
                } catch (nameError) {
                    console.error('❌ Name-based mutation también falló:', nameError);
                    throw nameError;
                }
            }

        } catch (error) {
            console.error('❌ DIAGNÓSTICO COMPLETO FALLÓ:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    },
    async debugAddOrder(terminalId, productName = 'CAFE AMERICANO', quantity = 1, portion = 'Normal', productId = 910) {
        debug('🔧 DEBUG: Testing addOrderToTerminalTicket with:', { terminalId, productName, quantity, portion, productId });

        console.log('🔧 DEBUG: Testing addOrderToTerminalTicket');
        console.log('Parameters:', { terminalId, productName, quantity, portion, productId });

        try {
            // Test 1: Basic validation
            console.log('📋 Test 1: Basic validation');
            if (!terminalId) throw new Error('Terminal ID missing');
            if (!productName && !productId) throw new Error('Product name or ID missing');
            console.log('✅ Basic validation passed');

            // Test 2: Try with productId first (if available)
            if (productId) {
                console.log('📋 Test 2: Attempting with productId');
                try {
                    const resultById = await this.addOrderById(terminalId, productId, quantity, portion);
                    console.log('✅ ProductId method succeeded:', resultById);
                    return { success: true, method: 'productId', result: resultById };
                } catch (idError) {
                    console.warn('⚠️ ProductId method failed:', idError.message);
                }
            }

            // Test 3: Check if product exists in menu
            console.log('📋 Test 3: Product validation (by name)');
            await this.validateProductExists(productName);
            console.log('✅ Product validation passed');

            // Test 4: Try the actual mutation with productName
            console.log('📋 Test 4: Attempting mutation (by name)');
            const vars = {
                terminalId: String(terminalId),
                productName: String(productName),
                quantity: parseFloat(quantity) || 1,
                portion: String(portion || 'Normal')
            };

            console.log('Variables:', vars);

            const result = await graphqlRequest(ADD_ORDER_TO_TERMINAL_TICKET, vars);
            console.log('✅ Mutation result (by name):', result);

            return { success: true, method: 'productName', result };

        } catch (error) {
            console.error('❌ DEBUG test failed:', error.message);
            console.error('Full error:', error);
            throw error;
        }
    },    /**
     * Valida los datos de una orden antes de procesarla
     */
    validateOrderData(orderData) {
        const { quantity, price, productName } = orderData;

        if (!productName || productName.trim() === '') {
            throw new Error('El nombre del producto es requerido');
        }

        if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
            throw new Error('La cantidad debe ser mayor a 0');
        }

        if (price !== undefined && (isNaN(price) || price < 0)) {
            throw new Error('El precio no puede ser negativo');
        }

        return true;
    },

    /**
     * Calcula el total de una orden
     */
    calculateOrderTotal(order) {
        const quantity = parseFloat(order.quantity) || 0;
        const price = parseFloat(order.price) || 0;
        return quantity * price;
    }
};
