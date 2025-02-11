import { appconfig } from '../config';

export const userService = {
    validatePin: async (pin) => {
        const config = appconfig();
        const token = localStorage.getItem('access_token');

        try {
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: `
                        query {
                            getUser(pin: "${pin}") {
                                name
                            }
                        }
                    `
                })
            });

            const result = await response.json();
            console.log('GraphQL Response:', result);

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            // Check if we got a valid user name back
            if (result.data?.getUser?.name) {
                return {
                    pin: pin,
                    name: result.data.getUser.name
                };
            }

            throw new Error('PIN inválido');

        } catch (error) {
            console.error('Error validando PIN:', error);
            throw error;
        }
    }
};