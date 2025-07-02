import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = 'admin123'; // Change this to a secure password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin12@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create initial prayer themes
  /*
  const themes = [
    {
      title: 'Spiritual Growth',
      description: 'Pray for spiritual maturity, deeper understanding of Scripture, and a closer walk with God.',
      active: true,
    },
    {
      title: 'Family',
      description: 'Pray for family relationships, parenting wisdom, and household peace.',
      active: true,
    },
    {
      title: 'Health & Healing',
      description: 'Pray for physical, emotional, and mental well-being and recovery from illness.',
      active: true,
    },
    {
      title: 'Guidance & Direction',
      description: 'Pray for wisdom in decision-making and clarity about God\'s will.',
      active: true,
    },
    {
      title: 'Missions & Outreach',
      description: 'Pray for missionaries, evangelism efforts, and the spread of the Gospel.',
      active: true,
    },
  ];

  for (const theme of themes) {
    const createdTheme = await prisma.prayerTheme.upsert({
      where: { id: 0 }, // This will always cause an upsert to create since ID 0 won't exist
      update: {},
      create: theme,
    });
    console.log('Created theme:', createdTheme.title);
  }
  */

  console.log('Seeding completed successfully! (Admin user only)');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
