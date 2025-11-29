import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function setupStorage() {
  try {
    console.log('§ Setting up Supabase Storage buckets...');

    // Check if admin-review-photos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error(' Error listing buckets:', listError);
      return;
    }

    console.log('¦ Existing buckets:', buckets?.map(b => b.name));

    const bucketName = 'admin-review-photos';
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      console.log(`¦ Creating bucket: ${bucketName}`);

      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });

      if (error) {
        console.error(' Error creating bucket:', error);
      } else {
        console.log(' Bucket created successfully:', data);
      }
    } else {
      console.log(' Bucket already exists:', bucketName);
    }

    console.log('\n‰ Storage setup complete!');
  } catch (error) {
    console.error(' Setup failed:', error);
  }
}

setupStorage();
