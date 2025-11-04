-- Create PickupAddress Table
CREATE TABLE IF NOT EXISTS pickup_address (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    state VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SellerBank Table
CREATE TABLE IF NOT EXISTS seller_bank (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pickup_address_seller_id ON pickup_address(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_seller_id ON seller_bank(seller_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pickup_address_updated_at BEFORE UPDATE ON pickup_address
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_bank_updated_at BEFORE UPDATE ON seller_bank
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
