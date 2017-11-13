$(showTip);
function showTip(){
	
	 $(".show").hover(function(){ 
		$(this).children("ul").stop().show();
		$(this).css('zIndex',10);
				},function(){
		$(this).css('zIndex',1);
		$(this).children("ul").stop().hide();	
	 });	 
	 $('.placeselects dt').click(function(){ 
		$('.placeselects dd').stop().show();	
	 });
	 $('.placeselects').hover(function(){ 
				},function(){
		$('.placeselects dd').stop().hide();		
	 });
	 $('.placeselects li').click(function(){
				$('.placeselects dt span').html($(this).html());
				$('.placeselects dd').stop().hide();	
				});	
	 $(".notice").click(function(){$(".apha-bg").show()})
	 $(".go").click(function(){$(".apha-bg").hide()})
	 
}