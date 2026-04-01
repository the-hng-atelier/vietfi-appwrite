# VietFi Advisor × Appwrite Cloud

Cố vấn Tài chính AI cho Người Việt — Clone dùng Appwrite Cloud.

## Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in your Appwrite credentials
npm install
npm run dev
```

## Manual Setup Steps (Required)

1. Tạo project trên [cloud.appwrite.io](https://cloud.appwrite.io)
2. Tạo 5 collections: `profiles`, `budget_pots`, `expenses`, `debts`, `gamification` (xem `docs/appwrite-schema.md`)
3. Enable Auth providers: Email/Password + Google OAuth
4. Connect GitHub repo to Appwrite Sites
5. Deploy function `chat-vetvang` (GitHub Actions)

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Appwrite Cloud (Auth + Database + Functions)
- Tailwind CSS v4
- Railway (Market data crawlers)
