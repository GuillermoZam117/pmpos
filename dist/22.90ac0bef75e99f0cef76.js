"use strict";(self.webpackChunkreact_boilerplate=self.webpackChunkreact_boilerplate||[]).push([[22],{2022:(t,e,a)=>{a.d(e,{automationService:()=>y});var n=a(2135),i=a(37560),r=a(17833);const s=a.n(r)()("pmpos:automation"),o=n.J1`
  mutation NotifyTerminalTicketEvent($terminalId: String!, $name: String!, $parameters: [ParameterInput]) {
    notifyTerminalTicketEvent(
      terminalId: $terminalId,
      name: $name,
      parameters: $parameters
    ) {
      success
    }
  }
`,m=n.J1`
  mutation ExecuteAutomationCommandForTerminalTicket($terminalId: String!, $name: String!, $value: String) {
    executeAutomationCommandForTerminalTicket(
      terminalId: $terminalId,
      name: $name,
      value: $value
    ) {
      success
    }
  }
`,c=n.J1`
  mutation UpdateEntityState($entityTypeName: String!, $entityName: String!, $stateName: String!, $state: String!) {
    updateEntityState(
      entityTypeName: $entityTypeName,
      entityName: $entityName,
      stateName: $stateName,
      state: $state
    ) {
      success
    }
  }
`,E=n.J1`
  query IsEntityExists($type: String!, $name: String!) {
    isEntityExists(type: $type, name: $name)
  }
`,l=n.J1`
  query GetEntity($type: String!, $name: String!) {
    getEntity(type: $type, name: $name) {
      id
      name
      customData
      states {
        stateName
        state
        stateValue
      }
    }
  }
`,u=n.J1`
  query GetEntities($type: String!, $search: String, $state: String) {
    getEntities(type: $type, search: $search, state: $state) {
      id
      name
      customData
      states {
        stateName
        state
        stateValue
      }
    }
  }
`,y={async notifyTicketEvent(t,e,a=[]){s("📢 Notifying ticket event:",{terminalId:t,eventName:e,parameters:a});try{const{data:n}=await i.S.mutate({mutation:o,variables:{terminalId:t,name:e,parameters:a.map((t=>{var e;return{name:t.name,value:(null===(e=t.value)||void 0===e?void 0:e.toString())||""}}))}});return s("✅ Event notified:",n.notifyTerminalTicketEvent),{success:n.notifyTerminalTicketEvent.success}}catch(t){throw s("❌ Failed to notify event:",t),new Error(`Error al notificar evento: ${t.message}`)}},async executeAutomationCommand(t,e,a=""){s("🤖 Executing automation command:",{terminalId:t,commandName:e,value:a});try{const{data:n}=await i.S.mutate({mutation:m,variables:{terminalId:t,name:e,value:(null==a?void 0:a.toString())||""}});return s("✅ Automation command executed:",n.executeAutomationCommandForTerminalTicket),{success:n.executeAutomationCommandForTerminalTicket.success}}catch(t){throw s("❌ Failed to execute automation command:",t),new Error(`Error al ejecutar comando: ${t.message}`)}},async updateEntityState(t,e,a,n){s("🔄 Updating entity state:",{entityTypeName:t,entityName:e,stateName:a,state:n});try{const{data:r}=await i.S.mutate({mutation:c,variables:{entityTypeName:t,entityName:e,stateName:a,state:n}});return s("✅ Entity state updated:",r.updateEntityState),{success:r.updateEntityState.success}}catch(t){throw s("❌ Failed to update entity state:",t),new Error(`Error al actualizar estado: ${t.message}`)}},async entityExists(t,e){s("🔍 Checking if entity exists:",{type:t,name:e});try{const{data:a}=await i.S.query({query:E,variables:{type:t,name:e},fetchPolicy:"no-cache"});return s("✅ Entity existence checked:",a.isEntityExists),a.isEntityExists}catch(t){throw s("❌ Failed to check entity existence:",t),new Error(`Error al verificar entidad: ${t.message}`)}},async getEntity(t,e){s("📋 Getting entity:",{type:t,name:e});try{const{data:a}=await i.S.query({query:l,variables:{type:t,name:e},fetchPolicy:"no-cache"});return s("✅ Entity retrieved:",a.getEntity),a.getEntity}catch(t){throw s("❌ Failed to get entity:",t),new Error(`Error al obtener entidad: ${t.message}`)}},async getEntities(t,e=null,a=null){s("📋 Getting entities:",{type:t,search:e,state:a});try{const n={type:t};e&&(n.search=e),a&&(n.state=a);const{data:r}=await i.S.query({query:u,variables:n,fetchPolicy:"no-cache"});return s("✅ Entities retrieved:",r.getEntities),r.getEntities}catch(t){throw s("❌ Failed to get entities:",t),new Error(`Error al obtener entidades: ${t.message}`)}},events:{TICKET_CREATED:"TicketCreated",TICKET_CLOSED:"TicketClosed",ORDER_ADDED:"OrderAdded",ORDER_CANCELLED:"OrderCancelled",PAYMENT_PROCESSED:"PaymentProcessed",TABLE_OCCUPIED:"TableOccupied",TABLE_FREED:"TableFreed"},commands:{PRINT_BILL:"PrintBill",PRINT_RECEIPT:"PrintReceipt",SEND_TO_KITCHEN:"SendToKitchen",NOTIFY_WAITER:"NotifyWaiter",UPDATE_DISPLAY:"UpdateDisplay",LOCK_TERMINAL:"LockTerminal",UNLOCK_TERMINAL:"UnlockTerminal"},entityStates:{TABLE_STATUS:"Status",ORDER_STATE:"State",PAYMENT_STATUS:"PaymentStatus",TICKET_STATE:"TicketState"},stateValues:{TABLE_AVAILABLE:"Available",TABLE_OCCUPIED:"Occupied",TABLE_RESERVED:"Reserved",TABLE_CLEANING:"Cleaning",ORDER_NEW:"New",ORDER_SUBMITTED:"Submitted",ORDER_PREPARING:"Preparing",ORDER_READY:"Ready",ORDER_SERVED:"Served",ORDER_CANCELLED:"Cancelled",PAYMENT_PENDING:"Pending",PAYMENT_PARTIAL:"Partial",PAYMENT_COMPLETE:"Complete",PAYMENT_REFUNDED:"Refunded"},async executeWorkflow(t,e,a={}){s("🔄 Executing workflow:",{terminalId:t,workflowName:e,context:a});try{switch(e){case"COMPLETE_ORDER":return await this.completeOrderWorkflow(t,a);case"PROCESS_PAYMENT":return await this.processPaymentWorkflow(t,a);case"CLOSE_TABLE":return await this.closeTableWorkflow(t,a);default:throw new Error(`Workflow desconocido: ${e}`)}}catch(t){throw s("❌ Workflow execution failed:",t),t}},async completeOrderWorkflow(t,e){return s("📝 Executing complete order workflow"),await this.notifyTicketEvent(t,this.events.ORDER_ADDED,[{name:"OrderCount",value:e.orderCount||1},{name:"TableName",value:e.tableName||""}]),await this.executeAutomationCommand(t,this.commands.SEND_TO_KITCHEN),e.tableName&&await this.updateEntityState("Tables",e.tableName,"Status","Occupied"),{success:!0,message:"Orden completada exitosamente"}},async processPaymentWorkflow(t,e){return s("💳 Executing payment workflow"),await this.notifyTicketEvent(t,this.events.PAYMENT_PROCESSED,[{name:"Amount",value:e.amount||0},{name:"PaymentType",value:e.paymentType||"Cash"}]),e.printReceipt&&await this.executeAutomationCommand(t,this.commands.PRINT_RECEIPT),{success:!0,message:"Pago procesado exitosamente"}},async closeTableWorkflow(t,e){return s("🏠 Executing close table workflow"),await this.notifyTicketEvent(t,this.events.TICKET_CLOSED,[{name:"TicketTotal",value:e.ticketTotal||0},{name:"TableName",value:e.tableName||""}]),e.tableName&&await this.updateEntityState("Tables",e.tableName,"Status","Available"),e.printBill&&await this.executeAutomationCommand(t,this.commands.PRINT_BILL),{success:!0,message:"Mesa cerrada exitosamente"}}}}}]);