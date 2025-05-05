import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createInitialAdmin() {
  try {
    // Admin user details - customize these as needed
    const email = 'admin@example.com';
    const password = 'SecurePassword123!';
    const firstName = 'Admin';
    const lastName = 'User';

    console.log('Checking if admin user already exists...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists.`);
      return;
    }

    console.log('Creating admin user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN',
        active: true,
      },
    });

    console.log(`Admin user created successfully: ${admin.email}`);
    console.log('Admin credentials:');
    console.log(`- Email: ${email}`);
    console.log(`- Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createInitialAdmin()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
