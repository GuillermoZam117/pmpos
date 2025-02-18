export const addOrderToTicket = async (ticketId, menuItem, portions, tags) => {
  const mutation = `
    mutation AddOrder($input: AddOrderInput!) {
      addOrder(input: $input) {
        id
        orders {
          menuItem
          quantity
          price
          totalAmount
          state
        }
      }
    }
  `;

  const variables = {
    input: {
      ticketId,
      menuItem: menuItem.id,
      portions: portions || 1,
      orderTags: tags || []
    }
  };

  return await executeGQLMutation(mutation, variables);
};