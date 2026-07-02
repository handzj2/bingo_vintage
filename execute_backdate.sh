#!/bin/bash
# Bingo Vintage — Loan Backdate Execution Script (VALIDATED)
# Generated from real Excel ledger data — validated against known balances
# All 14 payloads confirmed: balance < total, no template entries included

BASE_URL="https://your-backend.up.railway.app/api"
TOKEN="REPLACE_WITH_ADMIN_JWT_TOKEN"

# Loan 10 — NABENDE ANDREW
# Start: 2026-01-03 | Balance: 8,545,000 | Payments loaded: 15
echo "Backdating loan 10 (NABENDE ANDREW)..."
curl -s -X PATCH "$BASE_URL/loans/10/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-01-03", "newBalance": 8545000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 85000, "paidDate": "2026-01-11"}, {"installmentNumber": 2, "amountPaid": 85000, "paidDate": "2026-01-20"}, {"installmentNumber": 3, "amountPaid": 85000, "paidDate": "2026-01-27"}, {"installmentNumber": 5, "amountPaid": 120000, "paidDate": "2026-02-09"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2026-02-17"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2026-02-27"}, {"installmentNumber": 9, "amountPaid": 85000, "paidDate": "2026-03-09"}, {"installmentNumber": 10, "amountPaid": 85000, "paidDate": "2026-03-14"}, {"installmentNumber": 12, "amountPaid": 255000, "paidDate": "2026-04-03"}, {"installmentNumber": 15, "amountPaid": 85000, "paidDate": "2026-04-22"}, {"installmentNumber": 17, "amountPaid": 80000, "paidDate": "2026-05-04"}, {"installmentNumber": 19, "amountPaid": 50000, "paidDate": "2026-05-19"}, {"installmentNumber": 21, "amountPaid": 85000, "paidDate": "2026-06-02"}, {"installmentNumber": 23, "amountPaid": 100000, "paidDate": "2026-06-15"}, {"installmentNumber": 24, "amountPaid": 85000, "paidDate": "2026-06-22"}]}' | python3 -m json.tool
echo ""

# Loan 11 — KHAUKHA DAVID
# Start: 2025-12-30 | Balance: 8,120,000 | Payments loaded: 21
echo "Backdating loan 11 (KHAUKHA DAVID)..."
curl -s -X PATCH "$BASE_URL/loans/11/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-30", "newBalance": 8120000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 85000, "paidDate": "2026-01-04"}, {"installmentNumber": 2, "amountPaid": 85000, "paidDate": "2026-01-11"}, {"installmentNumber": 3, "amountPaid": 85000, "paidDate": "2026-01-18"}, {"installmentNumber": 4, "amountPaid": 85000, "paidDate": "2026-01-25"}, {"installmentNumber": 5, "amountPaid": 85000, "paidDate": "2026-02-01"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2026-02-08"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2026-02-15"}, {"installmentNumber": 8, "amountPaid": 85000, "paidDate": "2026-02-23"}, {"installmentNumber": 9, "amountPaid": 85000, "paidDate": "2026-03-02"}, {"installmentNumber": 10, "amountPaid": 85000, "paidDate": "2026-03-09"}, {"installmentNumber": 11, "amountPaid": 85000, "paidDate": "2026-03-16"}, {"installmentNumber": 12, "amountPaid": 85000, "paidDate": "2026-03-25"}, {"installmentNumber": 13, "amountPaid": 85000, "paidDate": "2026-04-02"}, {"installmentNumber": 14, "amountPaid": 85000, "paidDate": "2026-04-07"}, {"installmentNumber": 16, "amountPaid": 85000, "paidDate": "2026-04-23"}, {"installmentNumber": 18, "amountPaid": 85000, "paidDate": "2026-05-03"}, {"installmentNumber": 19, "amountPaid": 85000, "paidDate": "2026-05-13"}, {"installmentNumber": 20, "amountPaid": 85000, "paidDate": "2026-05-21"}, {"installmentNumber": 22, "amountPaid": 85000, "paidDate": "2026-05-30"}, {"installmentNumber": 23, "amountPaid": 85000, "paidDate": "2026-06-08"}, {"installmentNumber": 24, "amountPaid": 80000, "paidDate": "2026-06-18"}]}' | python3 -m json.tool
echo ""

# Loan 12 — NAMAKHAKO MUTWALIBI
# Start: 2026-06-21 | Balance: 10,240,000 | Payments loaded: 0
echo "Backdating loan 12 (NAMAKHAKO MUTWALIBI)..."
curl -s -X PATCH "$BASE_URL/loans/12/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-06-21", "newBalance": 10240000, "paidInstallments": []}' | python3 -m json.tool
echo ""

# Loan 13 — NAMBASI JAMES
# Start: 2026-06-22 | Balance: 10,240,000 | Payments loaded: 0
echo "Backdating loan 13 (NAMBASI JAMES)..."
curl -s -X PATCH "$BASE_URL/loans/13/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-06-22", "newBalance": 10240000, "paidInstallments": []}' | python3 -m json.tool
echo ""

# Loan 14 — MUTIMBYA JAMES ABDUL
# Start: 2026-06-22 | Balance: 10,340,000 | Payments loaded: 0
echo "Backdating loan 14 (MUTIMBYA JAMES ABDUL)..."
curl -s -X PATCH "$BASE_URL/loans/14/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-06-22", "newBalance": 10340000, "paidInstallments": []}' | python3 -m json.tool
echo ""

# Loan 15 — WAMBOGA SULIATI
# Start: 2026-06-15 | Balance: 10,160,000 | Payments loaded: 0
echo "Backdating loan 15 (WAMBOGA SULIATI)..."
curl -s -X PATCH "$BASE_URL/loans/15/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-06-15", "newBalance": 10160000, "paidInstallments": []}' | python3 -m json.tool
echo ""

# Loan 16 — MAFABI IVAN
# Start: 2025-05-11 | Balance: 7,735,000 | Payments loaded: 44
echo "Backdating loan 16 (MAFABI IVAN)..."
curl -s -X PATCH "$BASE_URL/loans/16/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-05-11", "newBalance": 7735000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 85000, "paidDate": "2026-01-07"}, {"installmentNumber": 3, "amountPaid": 85000, "paidDate": "2026-01-17"}, {"installmentNumber": 4, "amountPaid": 85000, "paidDate": "2026-01-26"}, {"installmentNumber": 5, "amountPaid": 85000, "paidDate": "2026-02-05"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2026-02-14"}, {"installmentNumber": 8, "amountPaid": 85000, "paidDate": "2026-02-23"}, {"installmentNumber": 9, "amountPaid": 85000, "paidDate": "2026-03-06"}, {"installmentNumber": 11, "amountPaid": 50000, "paidDate": "2026-03-18"}, {"installmentNumber": 13, "amountPaid": 85000, "paidDate": "2026-03-29"}, {"installmentNumber": 14, "amountPaid": 85000, "paidDate": "2026-04-07"}, {"installmentNumber": 16, "amountPaid": 85000, "paidDate": "2026-04-19"}, {"installmentNumber": 18, "amountPaid": 85000, "paidDate": "2026-05-03"}, {"installmentNumber": 19, "amountPaid": 70000, "paidDate": "2026-05-15"}, {"installmentNumber": 21, "amountPaid": 85000, "paidDate": "2026-05-23"}, {"installmentNumber": 23, "amountPaid": 100000, "paidDate": "2026-06-08"}, {"installmentNumber": 24, "amountPaid": 85000, "paidDate": "2026-06-19"}, {"installmentNumber": 26, "amountPaid": 85000, "paidDate": "2026-06-30"}, {"installmentNumber": 27, "amountPaid": 85000, "paidDate": "2026-05-18"}, {"installmentNumber": 28, "amountPaid": 85000, "paidDate": "2026-05-25"}, {"installmentNumber": 29, "amountPaid": 85000, "paidDate": "2026-06-01"}, {"installmentNumber": 30, "amountPaid": 85000, "paidDate": "2026-06-08"}, {"installmentNumber": 31, "amountPaid": 85000, "paidDate": "2026-06-19"}, {"installmentNumber": 32, "amountPaid": 85000, "paidDate": "2026-06-25"}, {"installmentNumber": 33, "amountPaid": 50000, "paidDate": "2026-07-01"}, {"installmentNumber": 34, "amountPaid": 85000, "paidDate": "2026-07-07"}, {"installmentNumber": 35, "amountPaid": 85000, "paidDate": "2026-07-14"}, {"installmentNumber": 36, "amountPaid": 85000, "paidDate": "2026-07-22"}, {"installmentNumber": 37, "amountPaid": 85000, "paidDate": "2026-07-29"}, {"installmentNumber": 38, "amountPaid": 85000, "paidDate": "2026-08-07"}, {"installmentNumber": 39, "amountPaid": 85000, "paidDate": "2026-08-13"}, {"installmentNumber": 40, "amountPaid": 85000, "paidDate": "2026-08-20"}, {"installmentNumber": 41, "amountPaid": 85000, "paidDate": "2026-08-27"}, {"installmentNumber": 42, "amountPaid": 70000, "paidDate": "2026-09-04"}, {"installmentNumber": 43, "amountPaid": 100000, "paidDate": "2026-09-06"}, {"installmentNumber": 45, "amountPaid": 60000, "paidDate": "2026-09-24"}, {"installmentNumber": 47, "amountPaid": 85000, "paidDate": "2026-10-04"}, {"installmentNumber": 48, "amountPaid": 85000, "paidDate": "2026-10-11"}, {"installmentNumber": 49, "amountPaid": 85000, "paidDate": "2026-10-18"}, {"installmentNumber": 50, "amountPaid": 85000, "paidDate": "2026-10-27"}, {"installmentNumber": 51, "amountPaid": 85000, "paidDate": "2026-11-04"}, {"installmentNumber": 54, "amountPaid": 85000, "paidDate": "2026-11-22"}, {"installmentNumber": 55, "amountPaid": 85000, "paidDate": "2026-12-01"}, {"installmentNumber": 57, "amountPaid": 50000, "paidDate": "2026-12-16"}, {"installmentNumber": 59, "amountPaid": 50000, "paidDate": "2026-12-30"}]}' | python3 -m json.tool
echo ""

# Loan 17 — MABONGA ASADI
# Start: 2025-06-22 | Balance: 8,685,000 | Payments loaded: 26
echo "Backdating loan 17 (MABONGA ASADI)..."
curl -s -X PATCH "$BASE_URL/loans/17/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-06-22", "newBalance": 8685000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 70000, "paidDate": "2026-01-09"}, {"installmentNumber": 2, "amountPaid": 35000, "paidDate": "2026-01-10"}, {"installmentNumber": 3, "amountPaid": 80000, "paidDate": "2026-01-19"}, {"installmentNumber": 4, "amountPaid": 20000, "paidDate": "2026-01-28"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2026-02-08"}, {"installmentNumber": 8, "amountPaid": 75000, "paidDate": "2026-02-25"}, {"installmentNumber": 10, "amountPaid": 60000, "paidDate": "2026-03-06"}, {"installmentNumber": 11, "amountPaid": 30000, "paidDate": "2026-03-18"}, {"installmentNumber": 14, "amountPaid": 85000, "paidDate": "2026-04-06"}, {"installmentNumber": 15, "amountPaid": 85000, "paidDate": "2026-04-17"}, {"installmentNumber": 22, "amountPaid": 85000, "paidDate": "2026-06-02"}, {"installmentNumber": 26, "amountPaid": 85000, "paidDate": "2026-06-30"}, {"installmentNumber": 27, "amountPaid": 85000, "paidDate": "2026-07-08"}, {"installmentNumber": 28, "amountPaid": 85000, "paidDate": "2026-07-15"}, {"installmentNumber": 29, "amountPaid": 85000, "paidDate": "2026-07-23"}, {"installmentNumber": 31, "amountPaid": 85000, "paidDate": "2026-08-04"}, {"installmentNumber": 32, "amountPaid": 85000, "paidDate": "2026-08-10"}, {"installmentNumber": 34, "amountPaid": 85000, "paidDate": "2026-08-23"}, {"installmentNumber": 35, "amountPaid": 85000, "paidDate": "2026-09-04"}, {"installmentNumber": 37, "amountPaid": 40000, "paidDate": "2026-09-15"}, {"installmentNumber": 40, "amountPaid": 85000, "paidDate": "2026-10-05"}, {"installmentNumber": 41, "amountPaid": 85000, "paidDate": "2026-10-17"}, {"installmentNumber": 44, "amountPaid": 90000, "paidDate": "2026-11-01"}, {"installmentNumber": 45, "amountPaid": 85000, "paidDate": "2026-11-12"}, {"installmentNumber": 48, "amountPaid": 85000, "paidDate": "2026-12-01"}, {"installmentNumber": 51, "amountPaid": 85000, "paidDate": "2026-12-23"}]}' | python3 -m json.tool
echo ""

# Loan 18 — MUSIMBI BOSCO
# Start: 2025-06-10 | Balance: 7,200,000 | Payments loaded: 35
echo "Backdating loan 18 (MUSIMBI BOSCO)..."
curl -s -X PATCH "$BASE_URL/loans/18/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-06-10", "newBalance": 7200000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 100000, "paidDate": "2026-01-05"}, {"installmentNumber": 3, "amountPaid": 100000, "paidDate": "2026-01-17"}, {"installmentNumber": 6, "amountPaid": 100000, "paidDate": "2026-02-08"}, {"installmentNumber": 7, "amountPaid": 100000, "paidDate": "2026-02-18"}, {"installmentNumber": 9, "amountPaid": 100000, "paidDate": "2026-03-02"}, {"installmentNumber": 11, "amountPaid": 150000, "paidDate": "2026-03-16"}, {"installmentNumber": 17, "amountPaid": 100000, "paidDate": "2026-04-29"}, {"installmentNumber": 19, "amountPaid": 100000, "paidDate": "2026-05-09"}, {"installmentNumber": 20, "amountPaid": 100000, "paidDate": "2026-05-19"}, {"installmentNumber": 23, "amountPaid": 100000, "paidDate": "2026-06-07"}, {"installmentNumber": 24, "amountPaid": 100000, "paidDate": "2026-06-14"}, {"installmentNumber": 25, "amountPaid": 100000, "paidDate": "2026-06-26"}, {"installmentNumber": 26, "amountPaid": 100000, "paidDate": "2026-01-06"}, {"installmentNumber": 27, "amountPaid": 100000, "paidDate": "2026-06-15"}, {"installmentNumber": 28, "amountPaid": 100000, "paidDate": "2026-06-23"}, {"installmentNumber": 29, "amountPaid": 100000, "paidDate": "2026-06-29"}, {"installmentNumber": 30, "amountPaid": 100000, "paidDate": "2026-07-06"}, {"installmentNumber": 31, "amountPaid": 100000, "paidDate": "2026-07-13"}, {"installmentNumber": 32, "amountPaid": 100000, "paidDate": "2026-07-20"}, {"installmentNumber": 33, "amountPaid": 100000, "paidDate": "2026-07-26"}, {"installmentNumber": 34, "amountPaid": 100000, "paidDate": "2026-08-03"}, {"installmentNumber": 35, "amountPaid": 100000, "paidDate": "2026-08-11"}, {"installmentNumber": 37, "amountPaid": 100000, "paidDate": "2026-08-23"}, {"installmentNumber": 38, "amountPaid": 100000, "paidDate": "2026-09-03"}, {"installmentNumber": 39, "amountPaid": 100000, "paidDate": "2026-09-09"}, {"installmentNumber": 40, "amountPaid": 100000, "paidDate": "2026-09-15"}, {"installmentNumber": 43, "amountPaid": 100000, "paidDate": "2026-10-04"}, {"installmentNumber": 44, "amountPaid": 100000, "paidDate": "2026-10-10"}, {"installmentNumber": 45, "amountPaid": 100000, "paidDate": "2026-10-18"}, {"installmentNumber": 46, "amountPaid": 100000, "paidDate": "2026-10-26"}, {"installmentNumber": 48, "amountPaid": 100000, "paidDate": "2026-11-10"}, {"installmentNumber": 49, "amountPaid": 100000, "paidDate": "2026-11-20"}, {"installmentNumber": 51, "amountPaid": 100000, "paidDate": "2026-12-02"}, {"installmentNumber": 53, "amountPaid": 100000, "paidDate": "2026-12-17"}, {"installmentNumber": 54, "amountPaid": 200000, "paidDate": "2026-12-26"}]}' | python3 -m json.tool
echo ""

# Loan 19 — WANGWA SWAIBU
# Start: 2025-06-08 | Balance: 7,698,000 | Payments loaded: 40
echo "Backdating loan 19 (WANGWA SWAIBU)..."
curl -s -X PATCH "$BASE_URL/loans/19/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-06-08", "newBalance": 7698000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 85000, "paidDate": "2026-01-02"}, {"installmentNumber": 3, "amountPaid": 78000, "paidDate": "2026-01-12"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2026-02-04"}, {"installmentNumber": 8, "amountPaid": 50000, "paidDate": "2026-02-18"}, {"installmentNumber": 12, "amountPaid": 85000, "paidDate": "2026-03-17"}, {"installmentNumber": 15, "amountPaid": 85000, "paidDate": "2026-03-30"}, {"installmentNumber": 17, "amountPaid": 85000, "paidDate": "2026-04-07"}, {"installmentNumber": 18, "amountPaid": 85000, "paidDate": "2026-04-16"}, {"installmentNumber": 20, "amountPaid": 85000, "paidDate": "2026-04-27"}, {"installmentNumber": 21, "amountPaid": 85000, "paidDate": "2026-05-02"}, {"installmentNumber": 22, "amountPaid": 85000, "paidDate": "2026-05-09"}, {"installmentNumber": 23, "amountPaid": 85000, "paidDate": "2026-05-18"}, {"installmentNumber": 24, "amountPaid": 85000, "paidDate": "2026-05-25"}, {"installmentNumber": 26, "amountPaid": 85000, "paidDate": "2026-06-12"}, {"installmentNumber": 29, "amountPaid": 85000, "paidDate": "2026-06-14"}, {"installmentNumber": 30, "amountPaid": 85000, "paidDate": "2026-06-21"}, {"installmentNumber": 31, "amountPaid": 85000, "paidDate": "2026-06-30"}, {"installmentNumber": 32, "amountPaid": 85000, "paidDate": "2026-07-11"}, {"installmentNumber": 33, "amountPaid": 85000, "paidDate": "2026-07-17"}, {"installmentNumber": 34, "amountPaid": 85000, "paidDate": "2026-07-25"}, {"installmentNumber": 35, "amountPaid": 85000, "paidDate": "2026-08-01"}, {"installmentNumber": 37, "amountPaid": 85000, "paidDate": "2026-08-09"}, {"installmentNumber": 38, "amountPaid": 85000, "paidDate": "2026-08-16"}, {"installmentNumber": 39, "amountPaid": 85000, "paidDate": "2026-08-23"}, {"installmentNumber": 40, "amountPaid": 85000, "paidDate": "2026-08-30"}, {"installmentNumber": 41, "amountPaid": 85000, "paidDate": "2026-09-07"}, {"installmentNumber": 42, "amountPaid": 85000, "paidDate": "2026-09-14"}, {"installmentNumber": 44, "amountPaid": 85000, "paidDate": "2026-09-27"}, {"installmentNumber": 45, "amountPaid": 85000, "paidDate": "2026-10-04"}, {"installmentNumber": 46, "amountPaid": 85000, "paidDate": "2026-10-11"}, {"installmentNumber": 47, "amountPaid": 79000, "paidDate": "2026-10-18"}, {"installmentNumber": 48, "amountPaid": 85000, "paidDate": "2026-10-25"}, {"installmentNumber": 49, "amountPaid": 85000, "paidDate": "2026-11-02"}, {"installmentNumber": 50, "amountPaid": 85000, "paidDate": "2026-11-08"}, {"installmentNumber": 51, "amountPaid": 83000, "paidDate": "2026-11-18"}, {"installmentNumber": 52, "amountPaid": 85000, "paidDate": "2026-11-23"}, {"installmentNumber": 53, "amountPaid": 85000, "paidDate": "2026-11-30"}, {"installmentNumber": 54, "amountPaid": 85000, "paidDate": "2026-12-07"}, {"installmentNumber": 55, "amountPaid": 85000, "paidDate": "2026-12-15"}, {"installmentNumber": 56, "amountPaid": 85000, "paidDate": "2026-12-21"}]}' | python3 -m json.tool
echo ""

# Loan 20 — WAKHOLI UMAR 2
# Start: 2023-06-05 | Balance: 1,610,000 | Payments loaded: 17
echo "Backdating loan 20 (WAKHOLI UMAR 2)..."
curl -s -X PATCH "$BASE_URL/loans/20/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2023-06-05", "newBalance": 1610000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 80000, "paidDate": "2026-01-05"}, {"installmentNumber": 3, "amountPaid": 80000, "paidDate": "2026-01-19"}, {"installmentNumber": 5, "amountPaid": 80000, "paidDate": "2026-02-02"}, {"installmentNumber": 7, "amountPaid": 80000, "paidDate": "2026-02-18"}, {"installmentNumber": 9, "amountPaid": 80000, "paidDate": "2026-03-01"}, {"installmentNumber": 11, "amountPaid": 80000, "paidDate": "2026-03-16"}, {"installmentNumber": 13, "amountPaid": 80000, "paidDate": "2026-04-04"}, {"installmentNumber": 15, "amountPaid": 80000, "paidDate": "2026-04-18"}, {"installmentNumber": 17, "amountPaid": 80000, "paidDate": "2026-04-28"}, {"installmentNumber": 19, "amountPaid": 80000, "paidDate": "2026-05-11"}, {"installmentNumber": 21, "amountPaid": 80000, "paidDate": "2026-05-29"}, {"installmentNumber": 24, "amountPaid": 55000, "paidDate": "2026-06-18"}, {"installmentNumber": 25, "amountPaid": 80000, "paidDate": "2026-06-23"}, {"installmentNumber": 29, "amountPaid": 255000, "paidDate": "2026-07-20"}, {"installmentNumber": 30, "amountPaid": 80000, "paidDate": "2026-07-31"}, {"installmentNumber": 32, "amountPaid": 80000, "paidDate": "2026-08-10"}, {"installmentNumber": 33, "amountPaid": 80000, "paidDate": "2026-08-22"}]}' | python3 -m json.tool
echo ""

# Loan 21 — BUKHALILIRA GODFREY
# Start: 2025-05-11 | Balance: 5,932,000 | Payments loaded: 15
echo "Backdating loan 21 (BUKHALILIRA GODFREY)..."
curl -s -X PATCH "$BASE_URL/loans/21/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-05-11", "newBalance": 5932000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 90000, "paidDate": "2027-01-05"}, {"installmentNumber": 2, "amountPaid": 85000, "paidDate": "2027-01-12"}, {"installmentNumber": 3, "amountPaid": 85000, "paidDate": "2027-01-21"}, {"installmentNumber": 5, "amountPaid": 140000, "paidDate": "2027-02-03"}, {"installmentNumber": 6, "amountPaid": 115000, "paidDate": "2027-02-12"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2027-02-20"}, {"installmentNumber": 9, "amountPaid": 85000, "paidDate": "2027-03-05"}, {"installmentNumber": 11, "amountPaid": 100000, "paidDate": "2027-03-17"}, {"installmentNumber": 12, "amountPaid": 85000, "paidDate": "2027-03-23"}, {"installmentNumber": 14, "amountPaid": 105500, "paidDate": "2027-04-06"}, {"installmentNumber": 15, "amountPaid": 85000, "paidDate": "2027-04-17"}, {"installmentNumber": 17, "amountPaid": 85000, "paidDate": "2027-04-27"}, {"installmentNumber": 19, "amountPaid": 85000, "paidDate": "2027-05-15"}, {"installmentNumber": 21, "amountPaid": 85000, "paidDate": "2027-05-25"}, {"installmentNumber": 23, "amountPaid": 90000, "paidDate": "2027-06-09"}]}' | python3 -m json.tool
echo ""

# Loan 22 — WABUSA BRIAN
# Start: 2025-05-17 | Balance: 7,425,000 | Payments loaded: 45
echo "Backdating loan 22 (WABUSA BRIAN)..."
curl -s -X PATCH "$BASE_URL/loans/22/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-05-17", "newBalance": 7425000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 80000, "paidDate": "2027-01-07"}, {"installmentNumber": 2, "amountPaid": 85000, "paidDate": "2027-01-14"}, {"installmentNumber": 4, "amountPaid": 85000, "paidDate": "2027-01-27"}, {"installmentNumber": 5, "amountPaid": 85000, "paidDate": "2027-02-05"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2027-02-12"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2027-02-21"}, {"installmentNumber": 8, "amountPaid": 85000, "paidDate": "2027-03-02"}, {"installmentNumber": 10, "amountPaid": 95000, "paidDate": "2027-03-14"}, {"installmentNumber": 11, "amountPaid": 85000, "paidDate": "2027-03-27"}, {"installmentNumber": 12, "amountPaid": 85000, "paidDate": "2027-04-02"}, {"installmentNumber": 14, "amountPaid": 85000, "paidDate": "2027-04-12"}, {"installmentNumber": 15, "amountPaid": 85000, "paidDate": "2027-04-20"}, {"installmentNumber": 16, "amountPaid": 85000, "paidDate": "2027-04-27"}, {"installmentNumber": 17, "amountPaid": 85000, "paidDate": "2027-05-08"}, {"installmentNumber": 20, "amountPaid": 300000, "paidDate": "2027-05-24"}, {"installmentNumber": 21, "amountPaid": 85000, "paidDate": "2027-06-03"}, {"installmentNumber": 24, "amountPaid": 85000, "paidDate": "2027-06-21"}, {"installmentNumber": 25, "amountPaid": 85000, "paidDate": "2026-05-24"}, {"installmentNumber": 26, "amountPaid": 170000, "paidDate": "2026-06-07"}, {"installmentNumber": 27, "amountPaid": 85000, "paidDate": "2026-06-14"}, {"installmentNumber": 28, "amountPaid": 85000, "paidDate": "2026-06-21"}, {"installmentNumber": 29, "amountPaid": 85000, "paidDate": "2026-06-29"}, {"installmentNumber": 30, "amountPaid": 85000, "paidDate": "2026-07-05"}, {"installmentNumber": 31, "amountPaid": 85000, "paidDate": "2026-07-13"}, {"installmentNumber": 32, "amountPaid": 85000, "paidDate": "2026-07-19"}, {"installmentNumber": 33, "amountPaid": 80000, "paidDate": "2026-07-27"}, {"installmentNumber": 35, "amountPaid": 85000, "paidDate": "2026-08-13"}, {"installmentNumber": 36, "amountPaid": 90000, "paidDate": "2026-08-18"}, {"installmentNumber": 37, "amountPaid": 85000, "paidDate": "2026-08-25"}, {"installmentNumber": 38, "amountPaid": 85000, "paidDate": "2026-08-31"}, {"installmentNumber": 39, "amountPaid": 85000, "paidDate": "2026-09-08"}, {"installmentNumber": 40, "amountPaid": 85000, "paidDate": "2026-09-15"}, {"installmentNumber": 41, "amountPaid": 85000, "paidDate": "2026-09-23"}, {"installmentNumber": 42, "amountPaid": 80000, "paidDate": "2026-09-30"}, {"installmentNumber": 43, "amountPaid": 90000, "paidDate": "2026-10-07"}, {"installmentNumber": 44, "amountPaid": 85000, "paidDate": "2026-10-14"}, {"installmentNumber": 45, "amountPaid": 85000, "paidDate": "2026-10-21"}, {"installmentNumber": 46, "amountPaid": 85000, "paidDate": "2026-10-28"}, {"installmentNumber": 47, "amountPaid": 80000, "paidDate": "2026-11-04"}, {"installmentNumber": 49, "amountPaid": 85000, "paidDate": "2026-11-17"}, {"installmentNumber": 50, "amountPaid": 85000, "paidDate": "2026-11-26"}, {"installmentNumber": 51, "amountPaid": 85000, "paidDate": "2026-12-03"}, {"installmentNumber": 52, "amountPaid": 85000, "paidDate": "2026-12-09"}, {"installmentNumber": 53, "amountPaid": 85000, "paidDate": "2026-12-19"}, {"installmentNumber": 55, "amountPaid": 100000, "paidDate": "2026-12-29"}]}' | python3 -m json.tool
echo ""

# Loan 23 — MUDEBO ROBERT
# Start: 2025-12-30 | Balance: 8,085,000 | Payments loaded: 19
echo "Backdating loan 23 (MUDEBO ROBERT)..."
curl -s -X PATCH "$BASE_URL/loans/23/backdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-30", "newBalance": 8085000, "paidInstallments": [{"installmentNumber": 1, "amountPaid": 85000, "paidDate": "2026-01-04"}, {"installmentNumber": 2, "amountPaid": 85000, "paidDate": "2026-01-11"}, {"installmentNumber": 3, "amountPaid": 85000, "paidDate": "2026-01-20"}, {"installmentNumber": 4, "amountPaid": 85000, "paidDate": "2026-01-28"}, {"installmentNumber": 6, "amountPaid": 85000, "paidDate": "2026-02-08"}, {"installmentNumber": 7, "amountPaid": 85000, "paidDate": "2026-02-16"}, {"installmentNumber": 8, "amountPaid": 85000, "paidDate": "2026-02-25"}, {"installmentNumber": 9, "amountPaid": 85000, "paidDate": "2026-03-04"}, {"installmentNumber": 10, "amountPaid": 85000, "paidDate": "2026-03-12"}, {"installmentNumber": 11, "amountPaid": 85000, "paidDate": "2026-03-18"}, {"installmentNumber": 13, "amountPaid": 85000, "paidDate": "2026-04-02"}, {"installmentNumber": 15, "amountPaid": 50000, "paidDate": "2026-04-14"}, {"installmentNumber": 16, "amountPaid": 85000, "paidDate": "2026-04-21"}, {"installmentNumber": 17, "amountPaid": 85000, "paidDate": "2026-04-27"}, {"installmentNumber": 18, "amountPaid": 85000, "paidDate": "2026-05-07"}, {"installmentNumber": 20, "amountPaid": 85000, "paidDate": "2026-05-22"}, {"installmentNumber": 22, "amountPaid": 85000, "paidDate": "2026-06-01"}, {"installmentNumber": 24, "amountPaid": 85000, "paidDate": "2026-06-16"}, {"installmentNumber": 26, "amountPaid": 170000, "paidDate": "2026-06-30"}]}' | python3 -m json.tool
echo ""

# Fix Musimbi Bosco phone (psql):
# UPDATE clients SET alt_phone = '0780862602' WHERE id = 102;