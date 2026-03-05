-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 007: Market Tables Public Access
--
-- Allow public access to market_deliveries and market_batches
-- for Module 3 functionality
-- ==============================================================

-- Allow anyone to create market deliveries
CREATE POLICY "Public insert access to market_deliveries"
  ON market_deliveries
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update market deliveries
CREATE POLICY "Public update access to market_deliveries"
  ON market_deliveries
  FOR UPDATE
  USING (true);

-- Allow anyone to read market deliveries
CREATE POLICY "Public read access to market_deliveries"
  ON market_deliveries
  FOR SELECT
  USING (true);

-- Allow anyone to create market batches
CREATE POLICY "Public insert access to market_batches"
  ON market_batches
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update market batches
CREATE POLICY "Public update access to market_batches"
  ON market_batches
  FOR UPDATE
  USING (true);

-- Allow anyone to read market batches
CREATE POLICY "Public read access to market_batches"
  ON market_batches
  FOR SELECT
  USING (true);
