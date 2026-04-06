# API Contracts for Edit/Delete Operations

## Transaction Operations

### Validate Transaction Edit
**Endpoint:** `POST /tm/v1/transactions/{id}/validate`

**Request:**
```json
{
  "debit": 250,
  "credit": 0,
  "description": "Updated description",
  "transaction_date": "2025-12-18",
  "reason": "Correction"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "warnings": [],
    "errors": [],
    "consequences": {
      "transaction_summary": {
        "old_debit": 300,
        "new_debit": 250,
        "old_credit": 0,
        "new_credit": 0,
        "amount_change": -50
      },
      "paired_transaction": {
        "transaction_id": 1193,
        "account_type": "company",
        "account_id": 1,
        "account_name": "شركة حلول",
        "will_be_updated": true,
        "old_amount": 300,
        "new_amount": 250
      },
      "balance_recalculations": [
        {
          "account_type": "client",
          "account_id": 45,
          "account_name": "طاهر الافغاني",
          "reason": "Transaction amount change",
          "current_balance": 2800,
          "estimated_new_balance": 2850
        }
      ],
      "invoice_impact": {
        "invoice_id": 86,
        "invoice_description": "ايداع قوائم 2023",
        "current_status": "partially_paid",
        "current_amount": 1500,
        "current_paid": 300,
        "current_remaining": 1200,
        "new_paid": 250,
        "new_remaining": 1250,
        "status_will_change": false,
        "new_status": "partially_paid"
      }
    }
  }
}
```

### Update Transaction
**Endpoint:** `PUT /tm/v1/transactions/{id}`

**Request:** Same as validate

**Response:**
```json
{
  "transaction_id": 679,
  "paired_transaction_id": 1193,
  "original": {
    "main": { /* transaction before edit */ },
    "paired": { /* paired transaction before edit */ }
  },
  "recalc_results": {
    "client_45": { /* balance recalc result */ },
    "company_1": { /* balance recalc result */ }
  }
}
```

### Delete Transaction
**Endpoint:** `DELETE /tm/v1/transactions/{id}`

**Request:**
```json
{
  "reason": "Duplicate entry"
}
```

**Response:**
```json
{
  "message": "Transaction pair deleted successfully",
  "data": {
    "deleted_ids": [679, 1193],
    "deleted_data": { /* original transactions */ },
    "recalc_results": { /* balance recalc results */ }
  }
}
```

## Invoice Operations

### Validate Invoice Edit
**Endpoint:** `POST /tm/v1/validate/invoice/{id}`

**Request:**
```json
{
  "amount": 700
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "warnings": [],
    "errors": [],
    "consequences": {
      "invoice_summary": {
        "old_amount": 500,
        "new_amount": 700,
        "current_paid": 0,
        "current_remaining": 500,
        "new_remaining": 700,
        "current_status": "pending",
        "new_status": "pending",
        "status_will_change": false
      },
      "transactions_affected": [
        {
          "transaction_id": 259,
          "type": "INVOICE_GENERATED",
          "account_type": "client",
          "account_name": "ابو تميم",
          "old_debit": 500,
          "new_debit": 700,
          "old_credit": 0,
          "new_credit": 0
        }
      ],
      "balance_recalculations": [
        {
          "account_type": "client",
          "account_id": 76,
          "account_name": "ابو تميم",
          "reason": "Invoice amount change",
          "current_balance": 4500,
          "estimated_change": 200
        }
      ]
    }
  }
}
```

### Update Invoice
**Endpoint:** `PUT /tm/v1/invoices/{id}`

**Request:**
```json
{
  "amount": 700
}
```

**Response:**
```json
{
  "id": 190,
  "client_id": 76,
  "amount": 700,
  "paid_amount": 0,
  "remaining_amount": 700,
  "status": "pending",
  /* ... other invoice fields */
  "transactions": [ /* updated transactions */ ]
}
```

## Task Operations

### Validate Task Edit
**Endpoint:** `POST /tm/v1/validate/task/{id}`

**Request:**
```json
{
  "amount": 300,
  "prepaid_amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "warnings": [],
    "errors": [],
    "consequences": {
      "task_summary": {
        "old_amount": 200,
        "new_amount": 300,
        "old_prepaid": 50,
        "new_prepaid": 100,
        "old_final_invoice": 150,
        "new_final_invoice": 200,
        "client_name": "ابو تميم"
      },
      "invoice_changes": [
        {
          "invoice_id": 522,
          "invoice_type": "prepaid",
          "invoice_description": "Prepayment for: مهمتي",
          "old_amount": 50,
          "new_amount": 100,
          "current_status": "paid",
          "current_paid": 50,
          "reason": "Prepaid amount change"
        }
      ],
      "balance_recalculations": [ /* ... */ ]
    }
  }
}
```
