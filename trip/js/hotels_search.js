
$(function(){

	 $('.chacks li').click(function(){ 
		index  =   $(".chacks li").index(this);
		$('.chacks li').removeClass("here");
	$(".chacks li").eq(index).addClass("here");
	 });
	 	
	 $('#flydate li').click(function(){ 
		index  =   $("#flydate li").index(this);
		$('#flydate li').removeClass("here");
	$("#flydate li").eq(index).addClass("here");
	 });
	 	
	 $('.flylist .morefly').click(function(){ 
		index  =   $(".flylist dt input").index(this);
		$('.flylist  dl').removeClass("here");
	$(".flylist  dl").eq(index).addClass("here");
	 });
	 
	 $('.flylist dl').hover(function(){ 
				},function(){
		$(this).removeClass("here");});

	 $('#close_search').click(function(){ 
		$('#filter').html("无其他筛选条件");
		$('#results').html("");
	 });
	 	  
	 $('.hotel_list dl h6.open').click(function(){ 
		index  =   $(".hotel_list dl h6.open").index(this);
		$(this).stop().hide();
		$(".hotel_list dl h6.close").eq(index).stop().show();
	    $(".hotel_list dl dd").eq(index).stop().slideToggle();
	 });
	 
	 $('.hotel_list dl h6.close').click(function(){ 
		index  =   $(".hotel_list dl h6.close").index(this);
		$(this).stop().hide();
		$(".hotel_list dl h6.open").eq(index).stop().show();
	    $(".hotel_list dl dd").eq(index).stop().slideToggle();
	 });
	 
	 	
	 $(".bigpics dd ul li").click(function(){
									  
		$(".bigpics dd ul li").removeClass("here");
		$(this).addClass("here");
		$(".bigpics dt img").attr("src",$(this).children("img").attr("name"));
	 });
	 
	 $(".bigpics .arrow").hover(function(){
			$(this).css({backgroundPosition:"0 -23px"});
		},function(){
			$(this).css({backgroundPosition:"0 0"});
			});
	
	var imgNum = $(".showPic ul li").length;//图片总数
	var page = (imgNum%5 == 0)?parseInt(imgNum/5):parseInt(imgNum/5) + 1; //分页数
	var currentPage = 1;
	$(".arrow").click(function(){
			if($(this).hasClass("hotelDownArrow")){
					if(currentPage < page){
						currentPage++;
						$(".showPic ul").animate({top:(-420*(currentPage-1))+"px"},300);
					}
				}else{
					if(currentPage > 1){
						currentPage--;
						$(".showPic ul").animate({top:(-420*(currentPage-1))+"px"},300);
					}
				}
			if(currentPage == 1){$(".hotelTopArrow").css({display:"none"}).siblings(".arrow").css({display:"block"}); }
			else if(currentPage == page){$(".hotelDownArrow").css({display:"none"}).siblings(".arrow").css({display:"block"}); }
			else{$(".arrow").css({display:"block"});}
		});
	
	 
});

function showsfoems(ids,names,m,n)
{
	$(ids).stop().slideToggle();
	$(names).eq(m).hide();
	$(names).eq(n).show();
	}
function showsfoemr(m,n)
{
	$("#searchs").stop().slideToggle();
	$(".moresearch li").eq(m).hide();
	$(".moresearch li").eq(n).show();
	}
