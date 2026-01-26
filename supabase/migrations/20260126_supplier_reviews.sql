-- =====================================================
-- SUPPLIER RATING & REVIEW SYSTEM
-- Created: January 26, 2026
-- =====================================================

-- Create supplier_reviews table
CREATE TABLE IF NOT EXISTS supplier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewer_name TEXT,
  reviewer_role TEXT DEFAULT 'builder',
  purchase_order_id UUID,
  
  -- Ratings (1-5 stars)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Review content
  title TEXT,
  review_text TEXT,
  
  -- Metadata
  is_verified_purchase BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'flagged')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier_id ON supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_reviewer_id ON supplier_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_status ON supplier_reviews(status);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_overall_rating ON supplier_reviews(overall_rating);

-- Create supplier_rating_summary table for cached aggregates
CREATE TABLE IF NOT EXISTS supplier_rating_summary (
  supplier_id UUID PRIMARY KEY,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  average_quality DECIMAL(3,2) DEFAULT 0,
  average_delivery DECIMAL(3,2) DEFAULT 0,
  average_communication DECIMAL(3,2) DEFAULT 0,
  average_value DECIMAL(3,2) DEFAULT 0,
  
  -- Rating distribution
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  
  -- Badges
  is_top_rated BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_helpful_votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES supplier_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_helpful BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Function to update supplier rating summary
CREATE OR REPLACE FUNCTION update_supplier_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate summary for the affected supplier
  INSERT INTO supplier_rating_summary (
    supplier_id,
    total_reviews,
    average_rating,
    average_quality,
    average_delivery,
    average_communication,
    average_value,
    five_star_count,
    four_star_count,
    three_star_count,
    two_star_count,
    one_star_count,
    is_top_rated,
    updated_at
  )
  SELECT 
    COALESCE(NEW.supplier_id, OLD.supplier_id),
    COUNT(*),
    ROUND(AVG(overall_rating)::numeric, 2),
    ROUND(AVG(quality_rating)::numeric, 2),
    ROUND(AVG(delivery_rating)::numeric, 2),
    ROUND(AVG(communication_rating)::numeric, 2),
    ROUND(AVG(value_rating)::numeric, 2),
    COUNT(*) FILTER (WHERE overall_rating = 5),
    COUNT(*) FILTER (WHERE overall_rating = 4),
    COUNT(*) FILTER (WHERE overall_rating = 3),
    COUNT(*) FILTER (WHERE overall_rating = 2),
    COUNT(*) FILTER (WHERE overall_rating = 1),
    (AVG(overall_rating) >= 4.5 AND COUNT(*) >= 5),
    NOW()
  FROM supplier_reviews
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
    AND status = 'published'
  ON CONFLICT (supplier_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    average_quality = EXCLUDED.average_quality,
    average_delivery = EXCLUDED.average_delivery,
    average_communication = EXCLUDED.average_communication,
    average_value = EXCLUDED.average_value,
    five_star_count = EXCLUDED.five_star_count,
    four_star_count = EXCLUDED.four_star_count,
    three_star_count = EXCLUDED.three_star_count,
    two_star_count = EXCLUDED.two_star_count,
    one_star_count = EXCLUDED.one_star_count,
    is_top_rated = EXCLUDED.is_top_rated,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update summary
DROP TRIGGER IF EXISTS trigger_update_supplier_rating ON supplier_reviews;
CREATE TRIGGER trigger_update_supplier_rating
  AFTER INSERT OR UPDATE OR DELETE ON supplier_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_rating_summary();

-- Enable RLS
ALTER TABLE supplier_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_rating_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_reviews
CREATE POLICY "Anyone can view published reviews"
  ON supplier_reviews FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can create reviews"
  ON supplier_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own reviews"
  ON supplier_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- RLS Policies for supplier_rating_summary
CREATE POLICY "Anyone can view rating summaries"
  ON supplier_rating_summary FOR SELECT
  USING (true);

-- RLS Policies for review_helpful_votes
CREATE POLICY "Anyone can view helpful votes"
  ON review_helpful_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON review_helpful_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add rating column to suppliers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN total_reviews INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'is_top_rated'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN is_top_rated BOOLEAN DEFAULT false;
  END IF;
END $$;

