# Test Credentials - LOCAL ONLY

**⚠️ DO NOT COMMIT THIS FILE TO GIT**

This file is automatically ignored by `.gitignore` (*.local pattern)

---

## Test User Accounts

### Admin Account
- **Email**: `admin-test@yourcompany.com`
- **Password**: `Admin123Test!`
- **Role**: Admin
- **Purpose**: Testing admin features (team notifications, salesperson filters, system campaigns)

### Agent A
- **Email**: `agent-a@yourcompany.com`
- **Password**: `Agent123Test!`
- **Role**: Agent
- **Purpose**: Testing lead claiming, pipeline, personal campaigns

### Agent B
- **Email**: `agent-b@yourcompany.com`
- **Password**: `Agent123Test!`
- **Role**: Agent
- **Purpose**: Testing RLS (should NOT see Agent A's leads)

---

## Setup Instructions

1. **Create Accounts via Frontend**:
   - Navigate to: `http://localhost:5173`
   - Sign up with each email/password above
   - Verify email if required (check Supabase Auth settings)

2. **Assign Admin Role** (via Supabase SQL Editor):
   ```sql
   -- After signing up admin account, run this SQL
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'admin-test@yourcompany.com';
   ```

3. **Verify Roles**:
   ```sql
   -- Check all test users and their roles
   SELECT
     u.email,
     ur.role,
     u.created_at
   FROM auth.users u
   LEFT JOIN user_roles ur ON ur.user_id = u.id
   WHERE u.email LIKE '%@yourcompany.com'
   ORDER BY u.created_at DESC;
   ```

---

## Browser Testing Setup

**Chrome Profiles** (for simultaneous testing):

1. **Profile 1 - Admin**: `chrome://profile` → Create "Admin Test"
   - Login: admin-test@yourcompany.com

2. **Profile 2 - Agent A**: `chrome://profile` → Create "Agent A Test"
   - Login: agent-a@yourcompany.com

3. **Profile 3 - Agent B**: `chrome://profile` → Create "Agent B Test"
   - Login: agent-b@yourcompany.com

This allows testing RLS policies simultaneously.

---

## Client Demo Account

### Demo Admin (For Client UAT)
- **Email**: `demo-admin@clientcompany.com`
- **Password**: `DemoPass2025!`
- **Role**: Admin
- **Purpose**: Client user acceptance testing

### Demo Agent (For Client UAT)
- **Email**: `demo-agent@clientcompany.com`
- **Password**: `DemoPass2025!`
- **Role**: Agent
- **Purpose**: Client to test agent features

---

## Production Accounts

**⚠️ DO NOT USE TEST PASSWORDS IN PRODUCTION**

Production accounts should:
- Use strong, unique passwords (16+ characters)
- Be created by actual users (not shared accounts)
- Have 2FA enabled (if Supabase supports it)

---

## Password Reset (If Needed)

**Via Supabase Dashboard**:
1. Authentication → Users
2. Find user by email
3. Click "Send Password Recovery"
4. Check email for reset link

**Via SQL**:
```sql
SELECT auth.send_password_reset_email('user@example.com');
```

---

**Last Updated**: November 29, 2025
**Security Level**: LOCAL DEVELOPMENT ONLY
