const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const users = [
    { id: 'usr-aminausiuacke', name: 'Amina Odhiambo', email: 'amina@usiu.ac.ke', avatarColor: '#8b5cf6' },
    { id: 'usr-briankiprop', name: 'Brian Kiprop', email: 'brian@uonbi.ac.ke', avatarColor: '#0284c7' },
    { id: 'usr-faithwanjiku', name: 'Faith Wanjiku', email: 'wanjiku@strathmore.edu', avatarColor: '#059669' }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: u,
      create: u,
    });
  }

  await prisma.document.upsert({
    where: { id: 'apt3040-distributed-systems' },
    update: {},
    create: {
      id: 'apt3040-distributed-systems',
      title: 'APT3040: Distributed Systems CRDT Implementation Report',
      ownerId: 'usr-aminausiuacke',
    }
  });

  await prisma.document.upsert({
    where: { id: 'csc411-operating-systems' },
    update: {},
    create: {
      id: 'csc411-operating-systems',
      title: 'CSC411: Operating Systems Group Design Document',
      ownerId: 'usr-briankiprop',
    }
  });

  console.log('Seeded database successfully!');
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
