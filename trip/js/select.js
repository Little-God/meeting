
$(bindSelects);

function bindSelects(){

	var selectlens = $("dl.selects").length;
	var num = 1;
	var lastselectnum = -1;
	for (i = 0; i < selectlens; i++) {
		var listclass = $("dl.selects").eq(i).attr("class");
		var newlist = listclass.split(" ");
		var lastclass = newlist[newlist.length - 1];
		var lastnum1 = lastclass.substring(7);
		var lastnum = lastnum1*1;
		if (lastnum != "" && lastnum >= 0) {
			if (lastselectnum <= lastnum) {
				lastselectnum = lastnum;
			}
		}
	}
	if (lastselectnum != "" && lastselectnum >= 0) {
		for (i = 0; i < selectlens; i++) {
			var listclass = $("dl.selects").eq(i).attr("class");
			var newlist = listclass.split(" ");
			var lastclass = newlist[newlist.length - 1];
			if (lastclass[lastclass.length - 1] <= 20
					&& lastclass.substring(0, 7) == 'selects') {
				selects("."+lastclass);
			} else {
				$("dl.selects").eq(i).addClass(
						"selects" + (num * 1 + lastselectnum * 1));
				selects(".selects" + (num * 1 + lastselectnum * 1));
				num = num + 1;
			}
		}
	} else {
		for (i = 0; i < selectlens; i++) {
			$("dl.selects").eq(i).addClass("selects" + i);
			selects(".selects" + i);
		}
	}
}

function selects(name){
	 $(name+' dt').click(function(){ 
		$(name+' dd').stop().show();	
	 });
	 $(name).hover(function(){ 
				},function(){
		$(name+' dd').stop().hide();		
	 });
	 $(name+' li').click(function(){
		
		//$(name+' dt').html($(this).html());
		$(name + ' :input').eq(0).val($(this).html());
		$(name+' dd').stop().hide();	
		//$(name+' input').attr("value",$(this).html());
		//alert($(name+' input').val());
		//queryDistricts();
	});
}

function showsfoun(selename,i)
{
	$("#"+selename+" span em").removeClass("shows");
	$("#"+selename+" span em").eq(i).addClass("shows");
	$("#"+selename+" ul").removeClass("showuls");
	$("#"+selename+" ul").eq(i).addClass("showuls");
	
	}

