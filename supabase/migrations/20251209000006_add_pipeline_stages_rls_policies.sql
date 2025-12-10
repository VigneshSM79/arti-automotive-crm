-- ============================================================================
-- Migration: Add RLS Policies for pipeline_stages Table
-- Date: 2025-12-09
-- Purpose: Allow admins to create, update, and delete pipeline stages
--          Allow all authenticated users to view pipeline stages
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Allow all authenticated users to view pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Allow admins to insert pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Allow admins to update pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Allow admins to delete pipeline stages" ON pipeline_stages;

-- ============================================================================
-- SECTION 2: CREATE NEW POLICIES
-- ============================================================================

-- Policy 1: Everyone can SELECT (view) pipeline stages
CREATE POLICY "Allow all authenticated users to view pipeline stages"
ON pipeline_stages
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Only admins can INSERT new stages
CREATE POLICY "Allow admins to insert pipeline stages"
ON pipeline_stages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 3: Only admins can UPDATE stages
CREATE POLICY "Allow admins to update pipeline stages"
ON pipeline_stages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 4: Only admins can DELETE stages
CREATE POLICY "Allow admins to delete pipeline stages"
ON pipeline_stages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- SECTION 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created for pipeline_stages table!';
  RAISE NOTICE '📋 Policies:';
  RAISE NOTICE '   - SELECT: All authenticated users';
  RAISE NOTICE '   - INSERT: Admin only';
  RAISE NOTICE '   - UPDATE: Admin only';
  RAISE NOTICE '   - DELETE: Admin only';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Admins can now create custom pipeline stages from UI';
END $$;

COMMIT;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. All authenticated users can view pipeline stages
-- 2. Only admin users can create new pipeline stages
-- 3. Only admin users can update/delete pipeline stages
-- 4. "New Stage" button will work for admins
--
-- Rollback (if needed):
-- DROP POLICY "Allow all authenticated users to view pipeline stages" ON pipeline_stages;
-- DROP POLICY "Allow admins to insert pipeline stages" ON pipeline_stages;
-- DROP POLICY "Allow admins to update pipeline stages" ON pipeline_stages;
-- DROP POLICY "Allow admins to delete pipeline stages" ON pipeline_stages;
-- ============================================================================
