$(function(){
	 $(".nav dd").hover(function(){
		$(".nav dd").addClass("here");	
		$(".nav dd ul").stop().show();
	 },function(){$(".nav dd").removeClass("here");
		$(".nav dd ul").stop().hide();});	 
	 $(".usedAddressInput").hover(function(){
				$(this).siblings("span.usedAddress").css({border:"1px solid #9b9691"})	;					  	
			},function(){
				$(this).siblings("span.usedAddress").css({border:"1px solid #e2e0de"})	;
				});
	 
	 $(".order1 .selects dt").hover(function(){
				$(this).siblings("dt").show();
			},function(){
					$(this).siblings("dt").hide()
				});
	$("#commonAddress li").click(function(){	
			var address = $(this).html();
			$(".usedAddress").html(address);
		});
	$("#commonAddress li").click(function() {
		var address = $(this).html();
		$(".usedAddress").html(address);
	});
	$("#travelSheet dd ul li").click(function() {
		$(".commonAddress,.selfTravelSheet,dl.useNewAddress").css({
			display : "none"
		});
		if($("dl.addressBase dd ").length == 1){
			$("dl.useNewAddress").css({display:"block"});
		}
		var getClassName = $(this).attr("id");
		$("." + getClassName).css({
			display : "block"
		});
	});
	
	
});

//new updates
function showTip(className,className_1){
	if(className == '' && className_1 == ''){$(".addressInfor,.innerSheetTip").css({display:"none"})}
	else {$(".addressInfor").css({display:"block"})}
	 if(className != '' && className_1 == ''){$(".innerSheetTip").css({display:"block"})}
	 else { $("span."+className).css({display:"block"});}
	}

$(function(){
	//»ÃµÆÆ¬ÂÖ»»ÉèÖÃ
	 var lens = $(".flash dt li").length;
	 $(".flash dt ul").css({width:lens*1000+"px"});
	 //	ÐÇ¼¶¾Æµêtab±êÇ© 星级酒店  李帅屏蔽
	// $(".thetitle li").click(function(){
	//		$(".thetitle li").removeClass("here");
	//		$(this).addClass("here");
	//		var getId = $(this).attr("id");
	//		$(".list2").css({display:"none"});
	//		$("."+getId+"_pic").css({display:"block"});
	//	});
	 $(".rectangle").each(function(){
		 $(this).children("div:lt(7)").css("background","#F1F1F1");
	 })
	 $(".price").hover(function(){
				$(this).children(".rectangle").css({display:"block"});
				},function(){
				$(this).children(".rectangle").css({display:"none"});
					});
	
	$(".buttonss input.else").hover(function(){
				$(this).css({backgroundPosition:"-212px 1px",color:"#506978"});
			},function(){
				$(this).css({backgroundPosition:"-212px -35px",color:"#fff"});
				});
	$(".list_title a.price_sort1").toggle(function(){
		$(this).css({backgroundPosition:"-194px -79px"});
	},function(){
		$(this).css({backgroundPosition:"-130px -79px"});
		});
	$(".list_title a.price_sort2").toggle(function(){
		$(this).css({backgroundPosition:"-130px -79px"});
	},function(){
		$(this).css({backgroundPosition:"-194px -79px"});
		});
	/*
	$(".list1 p:odd").css({borderBottom:"1px dashed #2484BF"});*/
	$(".list1 p:last").css({borderBottom:"none"});
	//优化经停查询(用二维数组盛放已查询的航班)
	var arrayIndex=0;
	var strArray=new Array();
	$(".pathFontTd,.pathFont")
			.hover(
					function() {
						var param = $(this).attr("param");
						var flightNo=param.split(",")[0];
						var showstr = "";
						if(strArray.length>0){
							for(i in strArray){
								if(flightNo==strArray[i][0]){
									showstr=strArray[i][1];
									break;
								}
							}
						}
						if(showstr==""){
							jQuery.ajax({
										type : "POST",
										url : "${rc.contextPath}/fly/showflyin/queryStopCity.jhtml",
										async : false,
										data : {
											"param" : param
										},
										success : function(data) {
											
											if (data.length > 2) {
												data = eval("(" + data + ")");
											}
											
											var stop = data.stopInfo;
											for(var i=0;i<stop.length;i++){
												var stopList = stop[i].split(",");
												showstr =  showstr 
												+ "经停："
												+ "<em>"
												+stopList[2]
												+"&nbsp;"
												+stopList[4]
												+ "</em>"
												+ "<br>"
												+ "预计起飞："
												+ "<em>"
												+ stopList[0]
												+ "</em>"
												+ "<br>"
												+ "预计到达："
												+ "<em>" 
												+stopList[1]
												+"</em><br/>";
											}
										}
							});
							strArray[arrayIndex]=new Array();
							strArray[arrayIndex][0]=flightNo;
							strArray[arrayIndex][1]=showstr;
							arrayIndex+=1;
						}
						$(this).siblings(".path,.pathTd").html(showstr);
						$(this).siblings(".path,.pathTd").css({
							display : "block"
						});
					}, function() {
						$(this).siblings(".path,.pathTd").css({
							display : "none"
						});
					});
    $(".btn").click(function(){
			$(".iKnow,.tipFrame").slideDown(200)				 
			})
    $(".iKnow").click(function(){
    	location.reload();
			$(this).siblings(".tipFrame").andSelf().css({display:"none"})	;			   
			});
	//ÎÒµÄ¶©µ¥-¾ÆµêÁÐ±í-ÁÐ±í
	$(".searchBtn").mouseover(function(){
			$(this).parent(".Research").animate({width:"410px"},400);
			$(this).css({float:"right",marginRight:"15px",fontSize:"14px"});
			});
	// 订单状态  hover 效果
	$(".orderStatus").hover(
		function(){ 
			$(".showStatus").show();
		},function(){
			$(".showStatus").hide();
		}
	);
	//$(".showStatus table tr:first td").css({background:"none repeat scroll 0% 0% rgb(7, 138, 211)",border:"none",color:"#fff",lineHeight:"30px"})
	//$(".showStatus table tr").find("td:first").css({borderLeft:"none"});
	//$(".showStatus table tr").find("td.borderExist").css({borderLeft:"1px dashed rgb(204, 204, 204)"});

	$("div.Research input").hover(function(){
			$(this).css({backgroundPosition:"0px -355px"});							 
		},function(){
			$(this).css({backgroundPosition:"0px -328px"});
		});
	$("td.flightName").hover(function(){
				$(this).find("a").css({display:"block"});
			},function(){
				$(this).find("a").css({display:"none"});
				});
	//ÎÒµÄ¶©µ¥-¾Æµê¶©µ¥-ÏêÇé
	/*$("#hotelDetailTable table tr:even td").css({color:"#6CAFCB"})*/
	$(".main .right table.list1 tr:first").css({height:"36px"});
	//»úÆ±¶©µ¥-ºË¶Ô¶©µ¥
	$(".box .boxline .order1 dd:odd").css({paddingRight:"110px"});
	//»úÆ±Ô¤¶©°ïÖú
	$(".main .right .list1 h5").next("p").css({fontWeight:"bold"});
	
	$(".terms_bottom em").click(function(){
		$(this).addClass("yes").siblings("em").removeClass("yes");
		});
	//¾ÆµêÔ¤¶©-ÆÕÍ¨¾ÆµêËÑË÷
	var ss=true;
	$(".BrandMore li.close,.BrandMore li.sure").hover(function(){
			$(this).css({color:"#fff",background:"#12c5bc"});
		},function(){
			$(this).css({color:"#676c6c",background:"#ccc"});
			});
	$(".BrandMore strong").click(function(){
			if(ss){
				$(this).css({backgroundPosition:"-225px -18px"});
				$(this).siblings("ul").css({display:"block"});
				ss=false;
			}else{
				$(this).css({backgroundPosition:"-300px -18px"});
				$(this).siblings("ul").css({display:"none"});
				ss=true;
			}
			});
	$(".BrandMore li.close,.BrandMore li.sure").click(function(){
			$(this).parent("ul").css({display:"none"});
			$(this).parent("ul").siblings("strong").css({backgroundPosition:"-300px -18px"});
			ss=true;
		});
	$(".BrandMore").each(function(i){
		$(".BrandMore").eq(i).css({zIndex:"1000"-i});
		
	});
	$(".outSpan").each(function(i){
		$(".outSpan").eq(i).css({zIndex:"100"-i});
		
	});
	
		//»úÆ±Ê×Ò³
		$("dl.selects.place dd li").hover(function(){
			$(this).css({color:"#316ac5"});
			},function(){
			$(this).css({color:"#000"});	
				});
		//
		
		//»úÆ±Ô¤¶©-¶©µ¥ÌîÐ´
		/*$(".yd_help").mouseover(function(){
				$(this).siblings("ul").children(".tableUl li:lt(4)").css({fontWeight:"bold"});							 
		})*/
		$(".continueOrderInput").hover(function(){
			$(this).css({color:"#fff",background:"#febe00"});				
			},function(){
			$(this).css({color:"#000",background:"#FFCC33"});		
			})
		//前台支付页面效果
		$("#zhilv").click(function(){
			if($(this).attr("checked")){
					$(".payZhiLvBi").css({display:"block"});
				}else{
					$(".payZhiLvBi").css({display:"none"});
				}
		});
		$("input[name=radioAddress]").click(function(){
			$(".addressBase dd").removeClass("defaultAddress");
			$(".addressBase dd em").remove();
			
			$(this).parent("dd").addClass("defaultAddress");
			$(this).parent("dd").prepend("<em>寄送至</em>");
			var bool = $("input.useNewAddress").attr("checked")	;
			if(bool){
					$("dl.useNewAddress").css({display:"block"});
					$(this).parent("dd").addClass("defaultAddress");
				}else{ $("dl.useNewAddress").css({display:"none"});}
		});
		//机票核对-核对订单
		$(".modifyMore").parents(".box").css({position:"relative"});
		$(".modifyMore").siblings(".boxline").css({height:"120px"});
	    $(".modifyMore").toggle(function(){
	 		var height = $(this).siblings(".boxline").find("table").css("height");
			$(this).css({backgroundPosition:"0 -18px"});
			$(this).html("收起");
			
			//$(this).siblings(".boxline").animate({height:height},500);
			$(this).parents(".box").find(".boxline").animate({height:height},500);
			
		},function(){
			$(this).css({backgroundPosition:"0 0"});
			$(this).html("更多");
			//$(this).siblings(".boxline").animate({height:"120px"},300);
			$(this).parents(".box").find('.boxline').animate({height:"120px"},300);
			});
})