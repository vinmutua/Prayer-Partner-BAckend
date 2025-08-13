# Prayer Partner One-Way Pairing System

## Manual Trigger Only Setup

This system has been configured to use **manual triggers only** for generating prayer partner pairings. The automatic scheduler has been removed.

## How the One-Way System Works

### Key Features:
1. **One-Way Knowledge**: Each participant knows who they're praying for, but not who's praying for them
2. **Non-Guesability**: Cryptographically secure shuffling prevents participants from deducing their prayer partner
3. **Circular Arrangement**: Users are arranged in a circle where each person prays for the next person
4. **Anonymous Prayer Recipients**: No one knows who is praying for them, maintaining anonymity

### Manual Trigger Endpoint

**POST** `/pairings/generate-weekly`
- **Access**: Admin only
- **Authentication**: Bearer token required
- **Description**: Manually generates new weekly one-way prayer pairings

### Example API Call:

```bash
curl -X POST "http://localhost:8080/pairings/generate-weekly" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Response Format:

```json
{
  "success": true,
  "message": "Weekly pairings generated successfully",
  "data": {
    "count": 10,
    "pairingType": "one-way-circular",
    "message": "Successfully created 10 one-way prayer pairings"
  }
}
```

## Security Features

### Secure Randomization
- Uses Node.js `crypto.randomInt()` for cryptographically secure random number generation
- Multiple rounds of Fisher-Yates shuffling to increase entropy
- Prevents predictable patterns that could allow participants to guess their prayer partners

### Database Structure
- `partner1Id`: The person doing the praying (receives email notification)
- `partner2Id`: The person being prayed for (remains anonymous to their prayer partner)
- Only the prayer giver receives email notifications

## Requirements

- Minimum 3 active users required for one-way pairings
- At least 1 active prayer theme required
- Admin privileges required to trigger pairing generation

## Email Notifications

Only prayer givers receive email notifications containing:
- Who they should pray for
- Prayer theme and description
- Duration of the prayer period
- Special message explaining the one-way nature of the assignment

Prayer recipients do **not** receive notifications about who is praying for them, maintaining the anonymity principle.
