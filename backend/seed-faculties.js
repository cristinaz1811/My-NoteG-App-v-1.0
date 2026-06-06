const db = require('./config/database');

const faculties = [
    {
        name: 'Faculty of Economic Studies',
        email_domain: 'stud.ase.ro',
        description: 'Economics and Business studies'
    },
    {
        name: 'Faculty of Engineering',
        email_domain: 'stud.upb.ro',
        description: 'Engineering and Technology programs'
    },
    {
        name: 'Faculty of Computer Science',
        email_domain: 'stud.fmi.ro',
        description: 'Computer Science and Informatics'
    },
    {
        name: 'Faculty of Medicine',
        email_domain: 'stud.umf.ro',
        description: 'Medicine and Healthcare studies'
    },
    {
        name: 'Faculty of Law',
        email_domain: 'stud.unibuc.ro',
        description: 'Law and Legal studies'
    }
];

async function seedFaculties() {
    try {
        console.log('Starting faculty seeding...');

        for (const faculty of faculties) {
            const result = await db.query(
                `INSERT INTO faculties (name, email_domain, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (email_domain) DO NOTHING
                 RETURNING id, name, email_domain`,
                [faculty.name, faculty.email_domain, faculty.description]
            );

            if (result.rows.length > 0) {
                console.log(`✓ Created faculty: ${result.rows[0].name} (${result.rows[0].email_domain})`);
            } else {
                console.log(`- Faculty already exists: ${faculty.name}`);
            }
        }

        console.log('Faculty seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Faculty seeding error:', error);
        process.exit(1);
    }
}

seedFaculties();
