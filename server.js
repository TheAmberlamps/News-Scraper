var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/VoxScrape", {
  useNewUrlParser: true
});

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First grab the body of the html with axios
  axios.get("http://www.vox.com/").then(function(response) {
    // Then load that into cheerio and save it to $
    var $ = cheerio.load(response.data);

    // Builds an Article by parsing through the response data
    $("div.c-entry-box--compact--article").each(function() {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("div")
        .children("h2")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.summary = $(this)
        .children("div")
        .children("p.p-dek")
        .text();
      if (result.summary === "") {
        result.summary = "No summary available.";
      }
      result.image = $(this)
        .children("a")
        .children("picture")
        .children("img")
        .attr("src");
      // Ok, images are being scraped properly unless they're in compact articles. Adding authors and publications dates to scraped articles is the next step. OR IS IT
      if (result.image === undefined) {
        result.image = "No image found.";
        // result.image = $(this)
        //   .children("a")
        //   .children("div.c-entry-box--compact__image")
        //   .children("img")
        //   .attr("src");
      }
      result.author = $(this);

      // A lot of children here to be wrangled. Invest time into handlebars and deploying this before spending more time on increased functionality, you jerk. It's more important to have a working site than it is to have a working site with wide functionality than it is to have a good-looking working site with wide functionality.

      // Get this fucking project up to MVP and deploy it before you spend hours unravelling spaghetti code FFS. Go looking for authors and publication dates after you get things running at their most basic, and in this case populating the site with handlebars objects.

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log("Article creation error: " + err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { note: dbNote._id },
        { new: true }
      );
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
