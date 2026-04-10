exports.getLocations = (req, res) => {
    const resourceData = {
        "shelters": [
            { "name": "City Center Shelter", "lat": 28.7041, "lon": 77.1025, "status": "Open" },
            { "name": "Northside School Gym", "lat": 28.7150, "lon": 77.1050, "status": "Open" }
        ],
        "food_water": [
            { "name": "Red Cross Station", "lat": 28.7011, "lon": 77.1035, "status": "Open" }
        ]
    };
    res.json(resourceData);
};
