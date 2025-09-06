# WeFact Provider Setup

WeFact is a Dutch invoicing platform that integrates with the Plumbing Agent v2 provider system using API key authentication.

## Prerequisites

- **WeFact Account**: Active WeFact subscription with API access enabled
- **IP Whitelist**: Your server's egress IP(s) must be whitelisted in WeFact settings
- **API Key**: Generate an API key from your WeFact administration panel

## Configuration Steps

### 1. Enable API Access in WeFact

1. Log into your WeFact administration panel
2. Navigate to **Settings** → **API Settings**
3. Enable API access for your account
4. Note your API endpoint (should be `https://api.mijnwefact.nl/v2/`)

### 2. Generate API Key

1. In WeFact settings, go to **API Keys** section
2. Generate a new API key for Plumbing Agent
3. Copy the API key - you'll need this for environment configuration
4. Set appropriate permissions for invoice and debtor management

### 3. IP Whitelist Configuration

**CRITICAL**: WeFact requires IP whitelisting for security.

1. In WeFact settings, find **IP Whitelist** or **Security** section
2. Add your production server's egress IP address(es)
3. For development, add your local IP or use a VPN with static IP
4. Test API connectivity after adding IPs

**Finding Your Server's Egress IP**:
```bash
# On your server, check egress IP:
curl -4 ifconfig.co
curl -4 icanhazip.com
```

### 4. Environment Variables

Add to your `.env.local` or production environment:

```bash
# WeFact Integration
WEFACT_API_KEY=your_wefact_api_key_here
WEFACT_BASE_URL=https://api.mijnwefact.nl/v2/  # Optional, defaults to this
INVOICING_WEFACT=true  # Enable WeFact provider
```

## Features & Capabilities

### ✅ Supported Features
- **Customer Management**: Automatic debtor creation/lookup by email or company name
- **Draft Invoice Creation**: Full invoice drafting with line items and VAT
- **Email Sending**: Send invoices via WeFact's email system
- **PDF Download**: Retrieve invoice PDFs as Base64 data
- **Status Mapping**: Comprehensive status mapping from WeFact to standardized states
- **Dutch Compliance**: Proper VAT handling (0%, 9%, 21%) and payment terms

### ❌ Not Supported
- **UBL Format**: WeFact doesn't provide UBL export
- **Direct Payment URLs**: WeFact doesn't generate payment links
- **Webhooks**: WeFact uses polling-based status updates (not webhook-driven)

## API Limitations

### Rate Limits
- WeFact API has standard rate limiting
- Built-in retry logic for 429 responses with exponential backoff
- Maximum 2 retries for 5xx errors

### Data Validation
- **Money Format**: WeFact expects decimal euros (converted from integer cents)
- **VAT Rates**: Supports Dutch standard rates: 0%, 9%, 21%
- **Customer Data**: Company name OR first/last name required
- **Invoice Lines**: Description and price required per line

## Status Mapping

WeFact statuses are mapped to standardized provider statuses:

| WeFact Status | Provider Status | Description |
|---------------|-----------------|-------------|
| `concept`, `draft` | `draft` | Invoice not yet sent |
| `open`, `sent`, `verzonden` | `sent` | Invoice sent to customer |
| `viewed`, `bekeken` | `viewed` | Customer opened invoice |
| `paid`, `betaald` | `paid` | Invoice fully paid |
| `overdue`, `achterstallig` | `overdue` | Payment overdue |
| `cancelled`, `geannuleerd` | `cancelled` | Invoice cancelled |
| *Unknown* | `unknown` | Unmapped status (logged for analysis) |

## Error Handling

### Common Errors

**Authentication Errors**:
```json
{
  "status": "error",
  "errors": ["Invalid API key"]
}
```
- Check `WEFACT_API_KEY` environment variable
- Verify API key is active in WeFact settings

**IP Whitelist Errors**:
```json
{
  "status": "error", 
  "errors": ["Access denied from IP"]
}
```
- Verify server IP is whitelisted in WeFact
- Check if IP has changed (dynamic IPs)

**Invoice Not Found**:
```json
{
  "status": "error",
  "errors": ["Invoice not found"]
}
```
- Invoice may not exist in WeFact
- Check external_id mapping

### Debug Steps

1. **Test API Connectivity**:
   ```bash
   curl -X POST https://api.mijnwefact.nl/v2/ \
     -H "Content-Type: application/json" \
     -d '{"api_key":"YOUR_KEY","controller":"debtor","action":"list"}'
   ```

2. **Check Environment**:
   ```bash
   # Verify environment variables are loaded
   echo $WEFACT_API_KEY
   echo $INVOICING_WEFACT
   ```

3. **Review Logs**:
   - Check application logs for WeFact API responses
   - Look for IP whitelist or authentication failures

## Technical Architecture

### Client-Adapter Pattern
- **WeFact Client**: Handles HTTP requests and response parsing
- **WeFact Adapter**: Implements provider interface with business logic
- **Status Mapper**: Converts WeFact statuses to standardized format

### Data Flow
1. **Invoice Creation**: DTO → Find/Create Debtor → Create WeFact Invoice
2. **Sending**: Call WeFact send API → Update local status
3. **Status Sync**: Periodic polling for status updates
4. **PDF Handling**: Download Base64 → Store in file system (future: cloud storage)

### Integration Points
- **Provider Registry**: Auto-discovery via `INVOICING_WEFACT=true`
- **Invoice Router**: Supports `provider: "wefact"` parameter
- **UI Components**: ProviderBadge shows "WeFact" chip with status

## Migration from Other Providers

When switching to WeFact from another provider:

1. **Data Export**: Export existing customer data to WeFact
2. **ID Mapping**: WeFact uses numeric identifiers (not UUIDs)  
3. **Status Reconciliation**: Map existing statuses using status mapper
4. **Testing**: Use sandbox/test mode before production switch

## Support & Troubleshooting

### WeFact Support
- **Documentation**: https://www.wefact.nl/api/
- **Support**: Contact WeFact support for API-specific issues
- **Status**: Check WeFact system status for service interruptions

### Plumbing Agent Integration
- **Logs**: Check server logs for detailed error messages
- **Feature Flag**: Disable with `INVOICING_WEFACT=false` if needed
- **Fallback**: Keep legacy invoice system enabled during transition

## Security Considerations

- **API Key Storage**: Use secure environment variable management
- **IP Restrictions**: Maintain strict IP whitelist in WeFact
- **HTTPS Only**: All API calls use TLS encryption
- **No Client Exposure**: API key is server-only (never sent to browser)
- **Audit Trail**: All provider calls are logged for compliance

---

**Implementation Status**: ✅ Production Ready  
**Last Updated**: 2025-09-05  
**Version**: WeFact Provider v1.0