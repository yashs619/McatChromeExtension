chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('message received');
    $(function () {
      $.ajax({
      type: 'POST',
      url: 'https://mcatapp.herokuapp.com',
      data: {
        "test" : "tester",
        "user" : request.id,
        "prevUrl" : request.pURL
      },
      success : function (response) {
        console.log('success!');
        if (response.redirectTo != undefined) {
          //DO NOTHING
        } else {

          var qNumber = response.questionNumber;
          var question = response.question;
          var answer1 = response.answer1;
          var answer2 = response.answer2;
          var answer3 = response.answer3;
          var answer4 = response.answer4;
          $('body').remove();
          $('head').remove();
          if (!$('form').hasClass('here')) {
            console.log('how');
            $('html').append("<head > <title>Your MCAT Question!</title> </head>");
            $('html').append(
              "<body > <p> Looks like you're trying to go on a Social Media Website...Here's an MCAT question instead! Answer it correctly and you'll be allowed to waste time. </p>" +
              "<form id = 'theQuestion' class = 'here'>  <p class='question' questionID =" +  qNumber + ">" + question + "</p>" +
              "<ul class='answers'> <input type='radio' class = 'q1' name ='q' value='A," + qNumber + "' id='q1a'>" + answer1 + "<br/>" +
              "<input type='radio' class = 'q1' name ='q' value='B," + qNumber + "' id='q1b'>" + answer2 + "<br/>" +
              "<input type='radio' class = 'q1' name ='q' value='C," + qNumber + "' id='q1c'>" + answer3 + "<br/>" +
              "<input type='radio' class = 'q1' name ='q' value='D," + qNumber + "' id='q1d'>" + answer4 + "<br/>" +
              "<input type = 'submit' value = 'Submit'></ul> </form>  </body>");

            $('#theQuestion').submit(function (event) {
              event.preventDefault();
              var answerChoice = $('.q1:checked').val();
              $.ajax({
                type: 'POST',
                url: 'https://mcatapp.herokuapp.com/checkAnswer',
                data: {
                  "user" : request.id,
                  "prevUrl" : request.pURL,
                  "q" : answerChoice
                },
                success : function (response) {
                  $('body').remove();
                  $('head').remove();
                  $('p').remove();
                  $('form').remove();
                  if (response.value === true) {
                    $('html').append("<body><p> Right Answer. Congrats! You can know browse social media for a limited amount of time. <p></body>");
                  } else {
                    $('html').append("<body><p> Wrong Answer. Try again later! If you want more information about the question, check question # " + response.question +
                      " on mcatquestion.com <p></body>");
                  }
                }
              });
            });
          }
        }
      }
    })
  })
})