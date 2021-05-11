  $(document).ready(function() {		
  $('#buttonsend').click( function() {
	
		var name    = $('#name').val();
		var business   = $('#business').val();
		var subject = $('#subject').val();
		var email   = $('#email').val();
		var phone   = $('#phone').val();
		var message = $('#message').val();
		
		$('.loading').fadeIn('fast');
		
		if (name != "" && subject != "" && email != "" && message != "")
			{

				$.ajax(
					{
						url: './sendemail.php',
						type: 'POST',
						data: "name=" + name + "&business=" + business + "&subject=" + subject + "&email=" + email + "&phone=" + phone + "&message=" + message,
						success: function(result) 
						{
							$('.loading').fadeOut('fast');
							if(result == "email_error") {
								$('#email').css({"border":"1px solid #FF8C8C"}).next('.require').text(' !');
							} else {
								$('#name, #business, #subject, #email, #phone, #message').val("");
								$('<div class="success-contact">Success. Acrowire has received your message. </div>').insertBefore('#contactFormArea');
								$('.success-contact').fadeOut(10000, function(){ $(this).remove(); });
							}
						}
					}
				);
				return false;
				
			} 
		else 
			{
				$('.loading').fadeOut('fast');
				if( name == "") $('#name').css({"background":"#FFFCFC","border":"2px solid #ffb6b6"});
				if(subject == "") $('#subject').css({"background":"#FFFCFC","border":"2px solid #ffb6b6"});
				if(email == "" ) $('#email').css({"background":"#FFFCFC","border":"2px solid #ffb6b6"});
				if(message == "") $('#message').css({"background":"#FFFCFC","border":"2px solid #ffb6b6"});
				return false;
			}
	});
	
		$('#name, #subject, #email,#message').focus(function(){
			$(this).css({"background":"#ffffff","border":"2px solid #d6d6d6"});
		});
      	
		});