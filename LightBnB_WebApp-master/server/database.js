const pg = require('pg');

const config = {
  user: 'labber',
  password: '',
  host: 'localhost',
  database: 'lightbnb'
};

const pool = new pg.Pool(config);

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email LIKE $1`, [`%${email}%`])
    .then((response) => {
      console.log('getuserwithemail', response.rows[0]);
      return response.rows[0];
    })
    .catch((error) => {console.log(error.message)});
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((response) => {
      console.log('getuserwithid', response.rows[0]);
      return response.rows[0];
    })
    .catch((error) => {console.log(error.message)});
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3) RETURNING *`, 
      [user.name, user.email, user.password])
    .then((response) => {
      console.log('adduser', response.rows);
      return response.rows[0];
    })
    .catch((error) => {console.log(error.message)});
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
      SELECT 
        properties.thumbnail_photo_url,
        reservations.id, 
        properties.title, 
        properties.number_of_bedrooms, 
        properties.number_of_bathrooms, 
        properties.parking_spaces,  
        reservations.start_date, 
        reservations.end_date,
        avg(rating) as average_rating,
        properties.cost_per_night
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT 10;
    `,[guest_id])
    .then((response) => {
      console.log(response.rows);
      return response.rows;
    })
    .catch((error) => {console.log(error.message)});
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  console.log('options!!!', options);
  const queryParams = [];

  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += ` WHERE properties.owner_id = $${queryParams.length} `;
  }

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` WHERE city LIKE $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && !options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }

  if (!options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `AND cost_per_night >= $${queryParams.length -1} AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `AND property_reviews.rating >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;
  console.log(queryString, queryParams);
  
  return pool
    .query(queryString, queryParams)
    .then((response) => {
      console.log('response', response.rows);
      return response.rows;
    })
    .catch((error) => {
      console.log(error.message);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
