$(function() {
	$('.search input').bind('focus',function(){
		$(this).parent().parent().addClass("hover");	
	});
	$('.search input').bind('blur',function(){
		$(this).parent().parent().removeClass("hover");
	});
	$('.input').bind('focus',function(){
		$(this).addClass("hover");
	});
	$('.input').bind('blur',function(){
		$(this).removeClass("hover");
	});
	
	$('.form input').bind('focus',function(){
		if($(this).val()==""){
			$(this).next("label").hide();	
		}
	});
	$('.form input').bind('blur',function(){
		if(!$(this).val()){
			$(this).next("label").show();	
		}
	});
	
	$(".back-top").click(function(){
		$('html,body').animate({scrollTop: '0px'}, 400);
		return false;					   
	})
	
	$(".nav li").each(function(){
		 $(this).hoverDelay({
			hoverEvent:function(){
				$(this).find(".sub").slideDown(300);
				$(this).find(".sub-mask").slideDown(300);
			},
			outEvent: function(){
				$(this).find(".sub").slideUp(200);
				$(this).find(".sub-mask").slideUp(200);
			}
		});
	})	
	

	
	jQuery(".news-slider").slide({titCell:".hd li",mainCell:".bd ul",effect:"leftLoop",trigger:"click",autoPlay:true,delayTime:700,interTime:6000,easing:"easeInOutExpo"});

	

	
	$("a.tab").hover(function () {
		$(this).parent().find("a.current").removeClass("current");
		$(this).addClass("current");
		for(var i=0;i<$(this).parent().find("a").length;i++){
			$("#"+$(this).parent().find("a:eq("+i+")").attr("rel")).hide();
		}
		$("#"+$(this).attr("rel")).show();
		return false;
	});
	
	
	$("a.tabs").click(function () {
		$(this).parent().find("a.current").removeClass("current");
		$(this).addClass("current");
		for(var i=0;i<$(this).parent().find("a").length;i++){
			$("#"+$(this).parent().find("a:eq("+i+")").attr("rel")).hide();
		}
		$("#"+$(this).attr("rel")).show();
		return false;
	});
	
	
		
});

var tur = true;
function haha(){
	t = $(document).scrollTop();
	if(t > 175){
		$('#header .mask').animate({height: '60px',opacity:1}, 300);
		$('#header .logo').animate({height: '48px',top: '7px'}, 300);
		$('#header .top-link').animate({top: '-35px'}, 300);
		$('#header .nav').animate({top: '25px'}, 300);
		if(t<$("body").height()-$(window).height()-130){
			$('#follow-btn').fadeIn(300);
			$('#follow-btn').css("bottom","2px");
		}else{
			$('#follow-btn').fadeIn(300);
			$('#follow-btn').css("bottom","132px");
		}
	}else{
		$('#header .mask').animate({height: '85px',opacity:0.8}, 300);
		$('#header .logo').animate({height: '55px',top: '18px'}, 300);
		$('#header .top-link').animate({top: '10px'}, 300);
		$('#header .nav').animate({top: '50px'}, 300);
		$('#follow-btn').fadeOut(300);
		$('#follow-btn').css("bottom","-106px");
	}
	tur = true;
} 

window.onscroll = function(){ 
	if(tur){
		setTimeout(haha,500); tur = false; 
	}else{
		
	} 
} 


