# Appwrite Database Schema — VietFi Advisor

## Database ID
`vietfi_db`

## Collections

### profiles
- Collection ID: `profiles`
- Attributes:
  - `user_id` (string, required, size=64)   ← ADD THIS (not $id — for consistent filtering)
  - `income` (float, optional)
  - `has_debt` (boolean, optional)
  - `risk_profile` (string, optional, size=32)
  - `setup_at` (datetime, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### budget_pots
- Collection ID: `budget_pots`
- Attributes:
  - `user_id` (string, required, size=64)
  - `name` (string, required, size=64)
  - `icon_key` (string, optional, size=32)
  - `allocated` (float, required)
  - `color` (string, optional, size=16)
  - `sort_order` (integer, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### expenses
- Collection ID: `expenses`
- Attributes:
  - `user_id` (string, required, size=64)
  - `pot_id` (string, optional, size=64)
  - `amount` (float, required)
  - `note` (string, optional, size=256)
  - `category` (string, optional, size=64)
  - `created_at` (datetime, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)
- Index: `index_created` on `created_at` (key type, DESC)

### debts
- Collection ID: `debts`
- Attributes:
  - `user_id` (string, required, size=64)
  - `name` (string, required, size=64)
  - `type` (string, required, size=32)
  - `principal` (float, required)
  - `rate` (float, required)
  - `min_payment` (float, required)
  - `icon` (string, optional, size=32)
  - `color` (string, optional, size=16)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### gamification
- Collection ID: `gamification`
- Attributes:
  - `xp` (integer, optional, default=0)
  - `level` (integer, optional, default=0)
  - `level_name` (string, optional, size=32)
  - `streak` (integer, optional, default=0)
  - `last_active_date` (string, optional, size=32)
  - `actions` (array, optional)
  - `quest_completed` (boolean, optional)
  - `lessons_done` (array, optional)
  - `streak_freeze` (string, optional, size=512) -- JSON stored as string
- Permissions: read(`users`), write(`users`)
