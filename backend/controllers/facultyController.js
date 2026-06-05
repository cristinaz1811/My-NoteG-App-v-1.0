const {
    getAllFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty
} = require('../utils/facultyService');

const getAll = async (req, res) => {
    try {
        const faculties = await getAllFaculties();
        res.json(faculties);
    } catch (error) {
        console.error('Get faculties error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const create = async (req, res) => {
    try {
        const { name, email_domain, description } = req.body;

        if (!name || !email_domain) {
            return res.status(400).json({ error: 'Name and email domain are required' });
        }

        const faculty = await createFaculty(name, email_domain, description);
        res.status(201).json(faculty);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ error: 'Faculty with this name or email domain already exists' });
        }
        console.error('Create faculty error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email_domain, description } = req.body;

        if (!id || !name || !email_domain) {
            return res.status(400).json({ error: 'Faculty ID, name, and email domain are required' });
        }

        const faculty = await updateFaculty(parseInt(id), name, email_domain, description);
        res.json(faculty);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Faculty with this name or email domain already exists' });
        }
        console.error('Update faculty error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Faculty ID is required' });
        }

        const success = await deleteFaculty(parseInt(id));
        if (!success) {
            return res.status(404).json({ error: 'Faculty not found' });
        }

        res.json({ message: 'Faculty deleted successfully' });
    } catch (error) {
        console.error('Delete faculty error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove
};
