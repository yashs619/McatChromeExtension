var MongoClient = require('mongodb').MongoClient;

var config = require('./config');
var  MONGO_URI = config.mongo.URI; 
var cors = require('cors');
var bodyParser = require('body-parser')
var cheerio = require("cheerio");
var express = require('express');
var request = require('request');
var app = express();
var port = process.env.PORT || 3000;
var database;

app.set('view engine', 'ejs');

MongoClient.connect(MONGO_URI, function(err, db) {
  if (err) return console.log(err)
  database = db;
  app.listen(port, function () {
  console.log('listening on port' + port);
  })  
})

app.use(cors());

app.use(bodyParser.urlencoded({extended: true}));

app.post('/', function (req, res) {
  var username = req.body.user;
  var prevUrl = req.body.prevUrl;
  var mcatCollection = database.collection('McatUsers');
  mcatCollection.findOne({user : username},
    function(err,doc) {
      var randomQuestion = 0;
      if (doc === null) {//create new doc
        mcatCollection.insertOne({
          user: username,
          lastQuestionAnswered: false,
          lastQuestionSeen: 0,
          lastQuestionCorrect: false,
          timeLastQuestionCorrect: 0,
          questionsAnsweredCorrect : [

          ],
          questionsAnsweredWrong : [
          ],
        })

         randomQuestion = Math.floor(Math.random() * 2950) +1;
      } else {
        var time = new Date();
        time = time.getTime();
        if (doc.lastQuestionCorrect && (time - doc.timeLastQuestionCorrect) < 60000) {
          res.send({redirectTo : prevUrl});
        }
        var userSeenQuestion = true;
        var randomQuestion;
        var questionsAnsweredC = doc.questionsAnsweredCorrect;
        var questionsAnsweredW = doc.questionsAnsweredWrong;
        var lastQuestion = '' + doc.lastQuestionSeen + '';
        if (doc.lastQuestionSeen != '0' && (questionsAnsweredC.indexOf(lastQuestion) === -1) 
          && (questionsAnsweredW.indexOf(lastQuestion) === -1)) {
          randomQuestion = doc.lastQuestionSeen;

        } else {
          while (userSeenQuestion) {

            randomQuestion = Math.floor(Math.random() * 2950) +1;
            randomQuestion = '' + randomQuestion + '';
            if (questionsAnsweredC.indexOf(randomQuestion) === -1) {
              userSeenQuestion = false;
            }
          }
        }

      }
      if (doc === null || !doc.lastQuestionCorrect || (time - doc.timeLastQuestionCorrect) > 60000) {
        var questionIDReal = randomQuestion;
        mcatCollection.findOne({user:username}, function (err, doc) {
          mcatCollection.update({user:username},
          {$set : 
            {
            lastQuestionSeen : questionIDReal
            } 
          });
        })

        questionScraper(questionIDReal, function callback(object) {
          res.send(
          {
            questionNumber : object.number,
            question : object.question,
            answer1 : object.firstChoice,
            answer2 : object.secondChoice,
            answer3 : object.thirdChoice,
            answer4 : object.fourthChoice 
          });  
        });
      }

  });

});


app.post('/checkAnswer', function(req, res) {
  var username = req.body.user;
  var prevUrl = req.body.prevUrl;

  var input = req.body.q;
  input = input.split(",");  
  var answerChoiceReal = input[0];
  var questionIDReal = input[1];

  answerChecker(answerChoiceReal, questionIDReal, function callback(val) {
    var mcatCollection = database.collection('McatUsers');
    if (val) {
      mcatCollection.findOne({user:username}, function (err, doc) {
        var newQuestionsRightArray = doc.questionsAnsweredCorrect;
        newQuestionsRightArray.push(questionIDReal);
        var newTime = new Date();
        newTime = newTime.getTime();

        mcatCollection.update({user:username},
          {$set : {
            questionsAnsweredCorrect : newQuestionsRightArray,
            timeLastQuestionCorrect : newTime,
            lastQuestionCorrect : true
          } 
        });
        res.send({value : val});
      });

      
    } else {

        mcatCollection.findOne({user:username}, function (err, doc) {
          var newQuestionsWrongArray = doc.questionsAnsweredWrong;
          newQuestionsWrongArray.push(questionIDReal);

          mcatCollection.update({user:username},
            {$set : {
              questionsAnsweredWrong : newQuestionsWrongArray,
              lastQuestionCorrect : false
            } 
          });
          res.send({value:val, question : questionIDReal});       
        });

    }
    
  })
});

var answerChecker = function (answerChoice, questionID, callback) {
  var finalResult;
  var groupChoice = "";
  switch (answerChoice) { 
    case "A":
      groupChoice = "one";
      break;
    case "B":
      groupChoice = "two";
      break;
    case "C":
      groupChoice = "three";
      break;
    case "D":
      groupChoice = "four";
      break;
    default:
      console.log('invalid choice! choosing A ...')
      groupChoice = "one"
  }
  var options = { 
    method: 'POST',
    url: 'http://www.mcatquestion.com/findquestion.php?arg1=' + questionID,
    headers:{ 
       'cache-control': 'no-cache',
       'content-type': 'application/x-www-form-urlencoded' },
    form: { 'group[]': groupChoice, submit: 'Submit' } };
  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    if (body.indexOf("Go to Correct Answer") > -1) {
      finalResult = false;
      callback(finalResult);
    } else {
      finalResult = true;
      callback(finalResult);
    }    
  });
}

var questionScraper = function (questionID, callback) {
  var questionObject = {};
  var questionIDConverted = '' + questionID + '';
  var options = { method: 'GET',
    url: 'http://www.mcatquestion.com/findquestion.php?arg1=' + questionID
  }

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var $ = cheerio.load(body);
    questionObject.number = questionID;
    questionObject.question = $('td > span').first().text();
    //console.log($('td > span  img').eq(1).prop('src')); // (2577)will be undefined if nada

    questionObject.firstChoice = $('#qadcontent form tr span').eq(2).text();
    questionObject.secondChoice = $('#qadcontent form tr span').eq(4).text();
    questionObject.thirdChoice = $('#qadcontent form tr span').eq(6).text();
    questionObject.fourthChoice = $('#qadcontent form tr span').eq(8).text();

    callback(questionObject);
  });
}
