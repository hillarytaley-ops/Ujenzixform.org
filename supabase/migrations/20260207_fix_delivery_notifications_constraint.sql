-- Fix delivery_notifications request_type check constraint
-- Add 'quote_accepted' and 'manual_delivery_request' as valid types

-- Drop the old constraint
ALTER TABLE delivery_notifications 
DROP CONSTRAINT IF EXISTS delivery_notifications_request_type_check;

-- Add new constraint with all valid types
ALTER TABLE delivery_notifications 
ADD CONSTRAINT delivery_notifications_request_type_check 
CHECK (request_type IN ('purchase_order', 'private_purchase', 'quote_accepted', 'manual_delivery_request'));
