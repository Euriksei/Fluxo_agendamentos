const SANDBOX_URL = 'https://api-sandbox.asaas.com/v3';
const UNAVAILABLE_MESSAGE = 'Serviço de pagamento indisponível no momento';

// Lido a cada request (não no import): o dotenv do app.js roda depois dos imports, e o ambiente nunca fica preso ao valor do boot.
// Em produção não há padrão: sem ASAAS_API_URL a chamada falha em vez de cair silenciosamente no sandbox.
export const getAsaasConfig = () =>
{
    const isProduction = process.env.NODE_ENV === 'production';
    const url = (process.env.ASAAS_API_URL || (isProduction ? '' : SANDBOX_URL)).trim().replace(/\/+$/, '');
    return { url, apiKey: process.env.ASAAS_API_KEY || '', isProduction };
};

// Para o log de boot: só o ambiente, nunca a chave
export const describeAsaasEnvironment = () =>
{
    const { url, apiKey } = getAsaasConfig();
    if (!url) return 'Asaas: NÃO CONFIGURADO (ASAAS_API_URL vazia em produção)';

    let host = '';
    try { host = new URL(url).host; } catch { return 'Asaas: ASAAS_API_URL inválida'; }

    const env = host === 'api-sandbox.asaas.com' ? 'SANDBOX' : host === 'api.asaas.com' ? 'PRODUÇÃO (api.asaas.com)' : `URL PERSONALIZADA (${host})`;
    return `Asaas: ${env}${apiKey ? '' : ' - ASAAS_API_KEY vazia'}`;
};

const unavailable = () => { const error = new Error(UNAVAILABLE_MESSAGE); error.status = 502; return error; };

// Erros do Asaas sobre os dados do pagador viram mensagem clara (o front mostra error.message); o resto segue a descrição do Asaas
const FRIENDLY_ERRORS = [
    { match: /cpf|cnpj/i, message: 'CPF ou CNPJ recusado pelo sistema de pagamento. Confira o número digitado.', code: 'INVALID_CPF_CNPJ' },
    { match: /email/i, message: 'Email recusado pelo sistema de pagamento. Confira o email da sua conta.', code: 'INVALID_EMAIL' },
    { match: /postalCode|cep/i, message: 'CEP inválido. Confira o CEP do titular.', code: 'INVALID_POSTAL_CODE' }
];

const friendlyAsaasError = (data) =>
{
    const first = data?.errors?.[0];
    if (!first) return null;
    const text = `${first.code || ''} ${first.description || ''}`;
    return FRIENDLY_ERRORS.find((rule) => rule.match.test(text)) || null;
};

class AsaasService
{
    async request(endpoint, options = {})
    {
        const { url: baseUrl, apiKey, isProduction } = getAsaasConfig();

        if (!baseUrl)
        {
            console.error('[asaas] ASAAS_API_URL não definida em produção: chamada bloqueada (sem fallback para o sandbox).');
            throw unavailable();
        }

        if (!apiKey)
        {
            console.error(`[asaas] ASAAS_API_KEY vazia${isProduction ? ' em produção' : ''}: chamada bloqueada.`);
            throw unavailable();
        }

        const url = `${baseUrl}${endpoint}`;

        const config = { headers: { 'Content-Type': 'application/json', 'access_token': apiKey, ...options.headers }, ...options };

        try 
        {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({})); // 404 do Asaas pode vir sem corpo

            if (!response.ok) 
            {
                // 401/403 do Asaas é problema da nossa chave: não repassar (o front trata 401 como sessão expirada e desloga)
                const isAuthError = response.status === 401 || response.status === 403;
                const friendly = isAuthError ? null : friendlyAsaasError(data);
                const error = new Error(isAuthError ? UNAVAILABLE_MESSAGE : (friendly?.message || data.errors?.[0]?.description || 'Erro na API ASAAS'));
                error.status = isAuthError ? 502 : response.status;
                if (friendly) error.code = friendly.code;
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

    // Busca por CPF foi removida de propósito: o mesmo CPF pode existir em outro cadastro (outro negócio ou CPF digitado errado) e a
    // cobrança ficaria presa ao cliente de outro usuário. O cliente do dono é achado pelo id salvo ou pelo externalReference user_<id>.
    async findCustomerByExternalReference(externalReference)
    {
        const result = await this.request(`/customers?externalReference=${encodeURIComponent(externalReference)}&limit=10`);
        // Defesa extra: só aceita correspondência exata (filtro do Asaas não deve, mas não confiamos em prefixo)
        return (result.data || []).find((c) => c.externalReference === externalReference && !c.deleted) || null;
    }

    // Asaas atualiza cliente com POST /customers/{id}; só os campos enviados mudam
    async updateCustomer(customerId, changes)
    {
        return await this.request(`/customers/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(changes) });
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

    async getCustomer(customerId) { return await this.request(`/customers/${encodeURIComponent(customerId)}`); }

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