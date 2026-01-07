-- ============================================================================
-- SHOPPING CART PERSISTENCE TABLE
-- Created: December 28, 2025
-- Purpose: Persist shopping cart items across sessions for logged-in users
-- ============================================================================

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    supplier_id UUID,
    product_name TEXT NOT NULL,
    product_image TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit TEXT DEFAULT 'piece',
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product ON public.cart_items(user_id, product_id);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own cart items
CREATE POLICY "Users can view their own cart items"
    ON public.cart_items
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
    ON public.cart_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
    ON public.cart_items
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
    ON public.cart_items
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cart_item_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS cart_items_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cart_item_timestamp();

-- Function to add or update cart item (upsert)
CREATE OR REPLACE FUNCTION public.upsert_cart_item(
    p_product_id UUID,
    p_product_name TEXT,
    p_price DECIMAL,
    p_quantity INTEGER DEFAULT 1,
    p_supplier_id UUID DEFAULT NULL,
    p_product_image TEXT DEFAULT NULL,
    p_unit TEXT DEFAULT 'piece',
    p_category TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cart_item_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to add items to cart';
    END IF;

    INSERT INTO public.cart_items (
        user_id, product_id, product_name, price, quantity, 
        supplier_id, product_image, unit, category, notes
    )
    VALUES (
        v_user_id, p_product_id, p_product_name, p_price, p_quantity,
        p_supplier_id, p_product_image, p_unit, p_category, p_notes
    )
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        price = EXCLUDED.price,
        product_name = EXCLUDED.product_name,
        product_image = COALESCE(EXCLUDED.product_image, cart_items.product_image),
        updated_at = NOW()
    RETURNING id INTO v_cart_item_id;

    RETURN v_cart_item_id;
END;
$$;

-- Function to get cart total
CREATE OR REPLACE FUNCTION public.get_cart_total()
RETURNS TABLE (
    total_items INTEGER,
    total_quantity INTEGER,
    total_price DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_items,
        COALESCE(SUM(quantity), 0)::INTEGER as total_quantity,
        COALESCE(SUM(price * quantity), 0)::DECIMAL as total_price
    FROM public.cart_items
    WHERE user_id = auth.uid();
END;
$$;

-- Function to clear cart (after checkout)
CREATE OR REPLACE FUNCTION public.clear_cart()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.cart_items WHERE user_id = auth.uid();
    RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cart_item TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cart_total TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_cart TO authenticated;

-- Add comment
COMMENT ON TABLE public.cart_items IS 'Persistent shopping cart for logged-in users';


