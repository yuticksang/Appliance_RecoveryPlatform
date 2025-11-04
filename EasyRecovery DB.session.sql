-- Create PickupAddress Table
     CREATE TABLE IF NOT EXISTS pickup_address (
         id SERIAL PRIMARY KEY,
         seller_id INTEGER NOT NULL REFERENCES users(id) ON      
     DELETE CASCADE,
         name VARCHAR(100) NOT NULL,
         phone VARCHAR(15) NOT NULL,
         state VARCHAR(50) NOT NULL,
         city VARCHAR(50) NOT NULL,
         zip_code VARCHAR(10) NOT NULL,
         pickup_address VARCHAR(255) NOT NULL