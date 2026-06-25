# GameComp

GameComp is a game price comparison platform designed to help players find the best deals across multiple digital game stores.

Using data from the RAWG API and IsThereAnyDeal (ITAD), GameComp allows users to search for games, compare prices from different retailers, and quickly identify the lowest available price.

## Features

* Search for games using the RAWG database
* Compare prices across multiple online stores
* Highlight the lowest available deal
* View game ratings and genres
* Browse trending and top-rated games
* Special deals section powered by IsThereAnyDeal
* Responsive card-based user interface

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla JS)

### Backend

* Node.js
* Express.js

### APIs

* RAWG API
* IsThereAnyDeal API

## Installation

Clone the repository:

```bash
git clone https://github.com/bmealy12-hue/game_comp_project.git
```

Navigate to the server directory:

```bash
cd game_comp_project/game-comp-server
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

Open the website in your browser and ensure the API server is running on:

```text
http://localhost:3000
```

## Project Structure

```text
game_comp_project/
│
├── index.html
├── game.html
├── Login.html
├── reset-password.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── script.js
│   ├── game.js
│   ├── auth.js
│   ├── config.js
│   └── reset-password.js
│
├── game-comp-server/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

## Current Functionality

* Game discovery section
* Hot picks section
* Top rated games section
* Deal aggregation from ITAD
* Search functionality
* Genre filtering
* Platform filtering
* Price comparison display

## Planned Improvements

* User accounts
* Wishlist functionality
* Price alerts
* Price history charts
* Physical retailer comparisons
* Additional storefront integrations
* Advanced filtering and sorting
* Better caching and performance optimisations

## Learning Objectives

This project was built to develop practical experience with:

* REST APIs
* Asynchronous JavaScript
* Express server development
* Frontend application design
* API data processing
* Git and GitHub workflows

## Author

Brendan Turner

## License

This project is intended for educational and portfolio purposes.
