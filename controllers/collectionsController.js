const Collection = require('../models/Collection');
const Task = require('../models/Task');


const handleAddNewCollection = async (req, res) => {
    try {
        const { collection_name } = req.body;
        const collection = await Collection.find({userId: req.user.userId});
        const isCollectionExists = collection.some(obj => obj.collection_name === collection_name);
        if(isCollectionExists) {
            return res.status(409).json({ error: { message: "Collection already exists." } });
        }
        const newCollection = new Collection({userId: req.user.userId, collection_name: collection_name.toLowerCase()});
        const saveCollection = await newCollection.save();
        res.status(200).json(newCollection);

    } catch (error) {
        res.status(500).json({ error: error });
        console.log(error);
    }
}

const handleUpdateCollection = async (req, res) => {
    try {
        let collection = await Collection.findById(req.params.id);
        if (collection.userId === req.user.userId) {
            try {
                const updatedCollection = await Collection.findByIdAndUpdate(
                    req.params.id,
                    {
                        $set: req.body,
                    },
                    { new: true }
                );
                res.status(200).json(updatedCollection);
            } catch (error) {
                res.status(500).json({ error: error });
            }
        } else {
            res.status(401).json("You can update only your collection");
        }

    } catch (error) {
        // console.log(error);
        res.status(404).json({ error: "Not found" });
    }
}

const handleDeleteCollection = async (req, res) => {
    try {
        let collection = await Collection.findById(req.params.id);
        if (collection.userId === req.user.userId) {
            const deletedCollection = await collection.delete();
            const deletedTasks =await Task.deleteMany({ user: collection.userId, collection_id: collection._id });
            res.status(200).json({ message: "Collection deleted" });
        } else {
            res.status(401).json({error: {message: "You can delete only your collection"}});
        }

    } catch (error) {
        console.log(error)
        res.status(404).json({ error: "Not found" });
    }
}

const handleGetAllCollections = async (req, res) => {
    try {
        const { collection_name } = req.query;
        const queryObject = {};
        if(collection_name) {
            queryObject.collection_name = { $regex: collection_name, $options: 'i'};
        }
        const allCollections = await Collection.find({ userId: req.user.userId, ...queryObject });
        res.status(200).json(allCollections);

    } catch (error) {
        res.status(500).json({ error: error });
    }
}

const handleGetSingleCollection = async (req, res) => {
    try {
        const collection = await Collection.findById({ _id: req.params.id });
        if (collection && req.user.userId === collection.userId) {
            res.status(200).json(collection);
        }
        else {
            res.status(404).json({ error: { message: "Not Found inv" }});
        }
    } catch (error) {
        // console.log(error)
        res.status(500).json({ error: error });
    }
}

module.exports = {
    handleAddNewCollection,
    handleUpdateCollection,
    handleDeleteCollection,
    handleGetAllCollections,
    handleGetSingleCollection
}