const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

class AsaasService 
{
    constructor() { this.baseUrl = ASAAS_API_URL; this.apiKey = ASAAS_API_KEY; }

    async request(endpoint, options = {}) 
    {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = { headers: { 'Content-Type': 'application/json', 'access_token': this.apiKey, ...options.headers }, ...options };

        try 
        {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) 
            {
                const error = new Error(data.errors?.[0]?.description || 'Erro na API ASAAS');
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } 
        catch (error) 
        {
            if (error.status) throw error;
            
            console.error('ASAAS API Error:', error);
            throw new Error('Erro ao conectar com o serviço de pagamento');
        }
    }

    async findOrCreateCustomer(customerData) 
    {
        const existing = await this.request(`/customers?cpfCnpj=${customerData.cpfCnpj}`);
        if (existing.data && existing.data.length > 0) return existing.data[0];
        return await this.createCustomer(customerData);
    }

    async createCustomer(customerData) 
    {
        return await this.request('/customers', {
            method: 'POST',
            body: JSON.stringify({
                name: customerData.name,
                email: customerData.email,
                cpfCnpj: customerData.cpfCnpj,
                phone: customerData.phone,
                mobilePhone: customerData.mobilePhone,
                address: customerData.address,
                addressNumber: customerData.addressNumber,
                complement: customerData.complement,
                province: customerData.province,
                postalCode: customerData.postalCode,
                externalReference: customerData.externalReference,
                notificationDisabled: customerData.notificationDisabled || false
            })
        });
    }

    async getCustomer(customerId) { return await this.request(`/customers/${customerId}`); }

    async createSubscription(subscriptionData) 
    {
        const payload = {
            customer: subscriptionData.customer,
            billingType: subscriptionData.billingType,
            value: subscriptionData.value,
            nextDueDate: subscriptionData.nextDueDate,
            cycle: subscriptionData.cycle || 'MONTHLY',
            description: subscriptionData.description,
            endDate: subscriptionData.endDate,
            maxPayments: subscriptionData.maxPayments,
            externalReference: subscriptionData.externalReference,
            split: subscriptionData.split,
            
            discount: subscriptionData.discount ? {
                value: subscriptionData.discount.value,
                dueDateLimitDays: subscriptionData.discount.dueDateLimitDays,
                type: subscriptionData.discount.type
            } : undefined,

            fine: subscriptionData.fine ? {
                value: subscriptionData.fine.value,
                type: subscriptionData.fine.type
            } : undefined,

            interest: subscriptionData.interest ? {
                value: subscriptionData.interest.value,
                type: subscriptionData.interest.type
            } : undefined
        };

        return await this.request('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    }

    async createSubscriptionWithCreditCard(subscriptionData, creditCard, creditCardHolderInfo) 
    {
        const payload = {
            customer: subscriptionData.customer,
            billingType: 'CREDIT_CARD',
            value: subscriptionData.value,
            nextDueDate: subscriptionData.nextDueDate,
            cycle: subscriptionData.cycle || 'MONTHLY',
            description: subscriptionData.description,
            endDate: subscriptionData.endDate,
            maxPayments: subscriptionData.maxPayments,
            externalReference: subscriptionData.externalReference,
            
            creditCard: {
                holderName: creditCard.holderName,
                number: creditCard.number,
                expiryMonth: creditCard.expiryMonth,
                expiryYear: creditCard.expiryYear,
                ccv: creditCard.ccv
            },

            creditCardHolderInfo: {
                name: creditCardHolderInfo.name,
                email: creditCardHolderInfo.email,
                cpfCnpj: creditCardHolderInfo.cpfCnpj,
                postalCode: creditCardHolderInfo.postalCode,
                addressNumber: creditCardHolderInfo.addressNumber,
                addressComplement: creditCardHolderInfo.addressComplement,
                phone: creditCardHolderInfo.phone,
                mobilePhone: creditCardHolderInfo.mobilePhone
            },

            discount: subscriptionData.discount,
            fine: subscriptionData.fine,
            interest: subscriptionData.interest,
            split: subscriptionData.split,
            remoteIp: subscriptionData.remoteIp
        };

        return await this.request('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    }

    async createSubscriptionWithCreditCardToken(subscriptionData, creditCardToken, creditCardHolderInfo) 
    {
        const payload = {
            customer: subscriptionData.customer,
            billingType: 'CREDIT_CARD',
            value: subscriptionData.value,
            nextDueDate: subscriptionData.nextDueDate,
            cycle: subscriptionData.cycle || 'MONTHLY',
            description: subscriptionData.description,
            endDate: subscriptionData.endDate,
            maxPayments: subscriptionData.maxPayments,
            externalReference: subscriptionData.externalReference,
            creditCardToken: creditCardToken,

            creditCardHolderInfo: {
                name: creditCardHolderInfo.name,
                email: creditCardHolderInfo.email,
                cpfCnpj: creditCardHolderInfo.cpfCnpj,
                postalCode: creditCardHolderInfo.postalCode,
                addressNumber: creditCardHolderInfo.addressNumber,
                addressComplement: creditCardHolderInfo.addressComplement,
                phone: creditCardHolderInfo.phone,
                mobilePhone: creditCardHolderInfo.mobilePhone
            },

            discount: subscriptionData.discount,
            fine: subscriptionData.fine,
            interest: subscriptionData.interest,
            split: subscriptionData.split,
            remoteIp: subscriptionData.remoteIp
        };

        return await this.request('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    }

    async listSubscriptions(filters = {}) 
    {
        const params = new URLSearchParams();
        
        if (filters.customer) params.append('customer', filters.customer);
        if (filters.billingType) params.append('billingType', filters.billingType);
        if (filters.status) params.append('status', filters.status);
        if (filters.externalReference) params.append('externalReference', filters.externalReference);
        if (filters.offset) params.append('offset', filters.offset);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.includeDeleted) params.append('includeDeleted', filters.includeDeleted);

        const query = params.toString();
        return await this.request(`/subscriptions${query ? '?' + query : ''}`);
    }

    async getSubscription(subscriptionId) { return await this.request(`/subscriptions/${subscriptionId}`); }

    async updateSubscription(subscriptionId, updateData) 
    {
        const payload = {
            billingType: updateData.billingType,
            value: updateData.value,
            nextDueDate: updateData.nextDueDate,
            cycle: updateData.cycle,
            description: updateData.description,
            endDate: updateData.endDate,
            externalReference: updateData.externalReference,
            discount: updateData.discount,
            fine: updateData.fine,
            interest: updateData.interest,
            split: updateData.split,
            updatePendingPayments: updateData.updatePendingPayments || false
        };

        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        return await this.request(`/subscriptions/${subscriptionId}`, { method: 'PUT', body: JSON.stringify(payload) });
    }

    async deleteSubscription(subscriptionId) { return await this.request(`/subscriptions/${subscriptionId}`, { method: 'DELETE' }); }

    async updateSubscriptionCreditCard(subscriptionId, creditCard, creditCardHolderInfo) 
    {
        const payload = {
            creditCard: {
                holderName: creditCard.holderName,
                number: creditCard.number,
                expiryMonth: creditCard.expiryMonth,
                expiryYear: creditCard.expiryYear,
                ccv: creditCard.ccv
            },
            creditCardHolderInfo: {
                name: creditCardHolderInfo.name,
                email: creditCardHolderInfo.email,
                cpfCnpj: creditCardHolderInfo.cpfCnpj,
                postalCode: creditCardHolderInfo.postalCode,
                addressNumber: creditCardHolderInfo.addressNumber,
                addressComplement: creditCardHolderInfo.addressComplement,
                phone: creditCardHolderInfo.phone,
                mobilePhone: creditCardHolderInfo.mobilePhone
            }
        };

        return await this.request(`/subscriptions/${subscriptionId}/updateCreditCard`, { method: 'PUT', body: JSON.stringify(payload) });
    }

    async listSubscriptionPayments(subscriptionId, filters = {}) 
    {
        const params = new URLSearchParams();
        
        if (filters.status) params.append('status', filters.status);
        if (filters.offset) params.append('offset', filters.offset);
        if (filters.limit) params.append('limit', filters.limit);

        const query = params.toString();
        return await this.request(`/subscriptions/${subscriptionId}/payments${query ? '?' + query : ''}`);
    }

    async tokenizeCreditCard(customerId, creditCard, creditCardHolderInfo) 
    {
        const payload = {
            customer: customerId,
            creditCard: {
                holderName: creditCard.holderName,
                number: creditCard.number,
                expiryMonth: creditCard.expiryMonth,
                expiryYear: creditCard.expiryYear,
                ccv: creditCard.ccv
            },
            creditCardHolderInfo: {
                name: creditCardHolderInfo.name,
                email: creditCardHolderInfo.email,
                cpfCnpj: creditCardHolderInfo.cpfCnpj,
                postalCode: creditCardHolderInfo.postalCode,
                addressNumber: creditCardHolderInfo.addressNumber,
                addressComplement: creditCardHolderInfo.addressComplement,
                phone: creditCardHolderInfo.phone,
                mobilePhone: creditCardHolderInfo.mobilePhone
            }
        };

        return await this.request('/creditCard/tokenize', { method: 'POST', body: JSON.stringify(payload) });
    }

    async getPayment(paymentId) { return await this.request(`/payments/${paymentId}`); }

    async listPayments(filters = {}) 
    {
        const params = new URLSearchParams();
        
        if (filters.customer) params.append('customer', filters.customer);
        if (filters.subscription) params.append('subscription', filters.subscription);
        if (filters.billingType) params.append('billingType', filters.billingType);
        if (filters.status) params.append('status', filters.status);
        if (filters.externalReference) params.append('externalReference', filters.externalReference);
        if (filters.offset) params.append('offset', filters.offset);
        if (filters.limit) params.append('limit', filters.limit);

        const query = params.toString();
        return await this.request(`/payments${query ? '?' + query : ''}`);
    }

    async getPixQrCode(paymentId) { return await this.request(`/payments/${paymentId}/pixQrCode`); }

    async getBoletoIdentificationField(paymentId) { return await this.request(`/payments/${paymentId}/identificationField`); }
}

export default new AsaasService();