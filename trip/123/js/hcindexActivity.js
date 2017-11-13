var flyOrder = {};
/**
 * 乘车人类型：0代表"成人" 1代表"儿童" 购买保险：01代表"1份" 02代表"不购买"
 */
// 儿童票百分比---航空公司定义
var childrenPricePercent = 0.5;// 票面价
var childrenFuelPercent = 0.5;// 燃油费

$(function() {
	var num = $(".getImgLI li").length;
	for(i=0;i<num;i++){
		$(".appendLI").append("<li>");	
	}
	$(".appendLI li").eq(0).addClass("here");

	/**
	 * 选择常用旅客(默认填充首个 乘客名和证件号不为空的div)
	 */
	$("input[name='passengerCheck']").change(
			function() {
				var idx = $(this).attr("dIndex");
				var vls = $(this).parent().find('input[sel="' + idx + '"]')
						.val().split(",");
				if ($(this).attr("checked") == "checked") {
					var chFlag=0;
					//判断乘车人年龄
					if (vls[1] == "00"){
						if(vls[2].length==8){
							if(flyOrder.checkChildrenAge($("[name=departureDate]").val(),vls[2])){
								if($("#memberPayNum").val()==""){
									chFlag=1;
								}else{
									alert("该航班不支持儿童票!");
									 $(this).removeAttr("checked");
									chFlag=-1;
								}
							}else{
								//已经不是儿童了
							}
						}else{//成人
							chFlag=2;
						}
					}
					//end
					if(chFlag==0||chFlag==1||chFlag==2){
						var obj = flyOrder.getEmptyPassengerDiv();
						// 没有空的div 触发添加乘客div事件
						if (obj == -1) {
							flyOrder.addPasengerDiv();
							obj = flyOrder.getEmptyPassengerDiv();
						}
						$(obj).find('input[name="passengerName"]').val(vls[0]);// 乘车人姓名
						$(obj).find('input[name="certificationNumber"]')
								.val(vls[2]);// 乘车人证件号码
						if(chFlag==1){
							$(obj).find('input[name="passengerType"]').val("儿童");
							$(obj).attr("name","childrenPassenger");
							$(obj).find("input[name='insurance']").attr("min","childrenInsurance");
							if($("#backEndCity").val()!=""){
								$(obj).find("input[name='insurance']").val("2份");
							}else{
								$(obj).find("input[name='insurance']").val("1份");
							}
							flyOrder.passengerTypeSelectChange();
						}
						if(chFlag==2){
							$(obj).find('input[name="passengerType"]').val("成人");
							$(obj).attr("name","personPassenger");
							$(obj).find("input[name='insurance']").attr("min","personInsurance");
							if($("#backEndCity").val()!=""){
								$(obj).find("input[name='insurance']").val("2份");
							}else{
								$(obj).find("input[name='insurance']").val("1份");
							}
							flyOrder.passengerTypeSelectChange();
						}
						if (vls[1] == "00") {
							$(obj).find('input[name="certificationType"]').val(
									"身份证");
						}
						if (vls[1] == "01") {
							$(obj).find('input[name="certificationType"]').val(
									"护照");
						}
						if (vls[1] == "09") {
							$(obj).find('input[name="certificationType"]').val(
									"其他");
						}
						$(obj).attr("divIndex", "myPasengerDiv" + idx);// 把当前div和联系人复选框绑定
					}
				} else {
					var pasCount = $('body')
							.find('div[class="myPassengerDiv"]').length;
					if (pasCount == 1) {
						$('div[divIndex="myPasengerDiv' + idx + '"]').find(
								'input[name="passengerName"]').val("");// 乘车人姓名
						$('div[divIndex="myPasengerDiv' + idx + '"]').find(
								'input[name="certificationNumber"]').val("");// 乘车人证件号码
						$('div[divIndex="myPasengerDiv' + idx + '"]').find(
								'input[name="certificationType"]').val("身份证");// 置为默认类型
						//恢复默认成人乘客DIV
						$('div[divIndex="myPasengerDiv' + idx + '"]').find('input[name="passengerType"]').val("成人");
						$('div[divIndex="myPasengerDiv' + idx + '"]').attr("name","personPassenger");
						$('div[divIndex="myPasengerDiv' + idx + '"]').find("input[name='insurance']").attr("min","personInsurance");
						if($("#backEndCity").val()!=""){
							$('div[divIndex="myPasengerDiv' + idx + '"]').find("input[name='insurance']").val("2份");
						}else{
							$('div[divIndex="myPasengerDiv' + idx + '"]').find("input[name='insurance']").val("1份");
						}
						flyOrder.passengerTypeSelectChange();
						$('div[divIndex="myPasengerDiv' + idx + '"]').removeAttr("divIndex");// 解除绑定
					} else {
						flyOrder.delPasenger('', $(
								'div[divIndex="myPasengerDiv' + idx + '"]')
								.find('a[id="deletAbut"]'));// 删除DIV
					}
				}
			});
	/**
	 * 选择联系人
	 */
	$("input[name='linker']").change(
			function() {
				var idx = $(this).attr("selLinkIndex");
				var vls = $(this).parent().find(
						"input[linkIndex='" + idx + "']").val().split(",");
				var parentDiv = $(this).parent().parent().parent().parent();
				if ($(this).attr("checked") == "checked") {
					$(parentDiv).find("input[name='linkerName']").val(vls[0]);
					$(parentDiv).find("input[name='linkerPhone']").val(vls[1]);
				}
			});
	// 提交订单校验
	$('#writeOrderSubmit').click(function() {
	var passFlag=true;
					$("dl.passTypeDl").each(function(i){
					    	var passType = $(this).find("input.passType").val();
					    	var certType = $(this).siblings("dl").find("input.idCard").val();
					    	var certNum =  $(this).siblings("dl").find("input.idNum").val();
					    	if(passType == "成人"){
					    		if(certType == "身份证"){
					    			 if(certNum.length != 18){
					    			 	alert("乘车人类型和证件号码不匹配！");
					    			 	//$(this).siblings("dl").children("input.idNum").val("");
					    			 	passFlag=false;
					    			 	return false;
					    			 }
					    		}
					    	}else{
					    		if(certType == "身份证"){
					    			 if(certNum.length != 8){
					    			 	alert("乘车人类型和证件号码不匹配！");
					    			 	//$(this).siblings("dl").children("input.idNum").val("");
					    			 	passFlag=false;
					    			 	return false;
					    			 }
					    		}
					    	}
					    });
					     if(!passFlag){
					    	return false;
					    }
						var pasFlag = 0;
						var certiFlag = 0;
						var persion = 0;// 成人数量
						var children = 0;// 儿童数量
						var linkerName = $("#linkerName");
						var linkerPhone = $("#linkerPhone");
						// 证件号码
						$("input[name=certificationNumber]")
								.each(
										function() {
											if ($.trim($(this).val()) == ''
													|| $.trim($(this).val()) == null) {
												certiFlag = 0;
												$(this).focus();
												if ($(this).parent().find(
														"font").html() == null) {
													$(this)
															.parent()
															.append(
																	"<font color='red'>请填写证件号码</font>");
												}
												return false;
											} else {
												certiFlag = 1;
												$(this).parent().find("font")
														.remove();
											}
										});
						var orginValue = $(this);
						
						var cnArray = $("input[name=certificationNumber]");
						for(i = 0;i<cnArray.length;i++){
							for(k=i+1;k<cnArray.length;k++){
								if(cnArray[k].value == cnArray[i].value){
									alert("证件号码不能重复填写");
									return false;
								}
							}
						}            
						 $("input[name=certificationNumber]").not(orginValue).each(function () { 
						 	if (orginValue.val() == $(this).val()){  
						    	alert("证件号码不能重复填写");   
						        return false;  
						    }               
						 }); 
						// 乘客姓名
						$("input[name=passengerName]")
								.each(
										function() {
										var strLength = $(this).val().replace(/[^\x00-\xff]/g, 'xx');
										if(strLength.length>30){
											alert("乘车人姓名长度不能超过30个字符！");
											return false;
										}
											if ($.trim($(this).val()) == ''
													|| $.trim($(this).val()) == null) {
												pasFlag = 0;
												$(this).focus();
												if ($(this).parent().find(
														"font").html() == null) {
													$(this)
															.parent()
															.append(
																	"<font color='red'>请填写乘车人姓名</font>");
												}
												return false;
											} else {
												pasFlag = 1;
												$(this).parent().find("font")
														.remove();
											}
										});
						// 乘客类型
						$("input[name=passengerType]").each(function() {
							if ($.trim($(this).val()) == "成人") {
								persion += 1;
							} else {
								children += 1;
							}
						});
						if (null == linkerName || linkerName.val() == "") {
							if (linkerName.parent().find("font").html() == null) {
								linkerName.parent().append(
										"<font color='red'>请填联系人姓名</font>");
							}
							return false;
						} else {
							var strLength = linkerName.val().replace(/[^\x00-\xff]/g, 'xx');
							if(strLength.length >30){
								alert("联系人姓名不能超过30个字符！");
								return false;
							}
							linkerName.parent().find("font").remove();
						}
						if (null == linkerPhone || linkerPhone.val() == "") {
							if (linkerPhone.parent().find("font").html() == null) {
								linkerPhone.parent().append(
										"<font color='red'>请填联系人电话</font>");
							}
							return false;
						} else {
							linkerPhone.parent().find("font").remove();
						}
						if (pasFlag == 0 || certiFlag == 0) {
							return false;
						}
						if (children > persion) {
							alert("儿童数量不能超过成人数量");
							return false;
						}
						//return flyOrder.checkchildren();
						return true;
					});
	/*
	 * //开始验证 $('.form-writeOrderSubmit').validate({ rules: { passengerName: {
	 * required:true } },
	 * 
	 * 设置验证触发事件 focusInvalid: false,
	 * 
	 * 设置错误信息提示DOM errorPlacement: function(error, element) { error.appendTo(
	 * element.parent()); } })
	 */
});

flyOrder = {
	/**
	 * 动态添加旅客
	 */
	getPasengerHmtl : function(count) {
		var activityPrice=$("#activityPrice").val();
		var backActivityPrice=$("#backActivityPrice").val();
		var str;
		var str1;
		 if($("#backEndCity").val()!=""){
			 str = '<li onclick="flyOrder.insuranceSelectChange(this);">2份</li>';
			 str1 = '<input type="text" name="insurance"  min="personInsurance" class="showinput" value="2份" style="width:68px"  onchange="flyOrder.insuranceSelectChange(this)" readonly>';
		 }else{
			 str = '<li onclick="flyOrder.insuranceSelectChange(this);">1份</li>';
			 str1 = '<input type="text" name="insurance"  min="personInsurance" class="showinput" value="1份" style="width:68px"  onchange="flyOrder.insuranceSelectChange(this)" readonly>';
		 }
		 if($("#memberPayNum").val()==""){
	 		StringPass = '<li onclick="changepassengerType(this)">儿童</li>';
		 }else{
	 		StringPass ='';
		 }
		 if((activityPrice!="" && activityPrice!="0") || backActivityPrice!="0"){
			 var html = '<div class="myPassengerDiv" id="myPasengerDiv'
					+ count
					+ '" name="personPassenger"><div class="lines"></div>'
					+ '<dl>'
					+ '<dt id="passengerOrderBy">第'
					+ count
					+ '位乘车人：</dt>'
					+ '<dd>'
					+ '<a id="deletAbut" href="javascript:void(0)" onclick="flyOrder.delPasenger(\'\',this);" class="del">删除</a>'
					+ '</dd>'
					+ '</dl>'
					+ '<dl>'
					+ '<dt><strong>*</strong>乘车人姓名：</dt>'
					+ ' <dd>'
					+ '<input type="text" onBlur="flyOrder.changePassengerName(this);" name="passengerName" style="width:95px;margin: 0 8px 0 0;" id="textfield2" class="theinput theinput2" value=""/>'
					+ '<span class="show">'
					+ '<span class="yd_help" style="border-bottom:0;padding:0;"><img src="img/1352.png"></span>'
					+ '<ul>'
					+ '<li class="showtitle">乘客说明</li>'
					+ '<li>1. 乘车人姓名必须与所出示证件上的姓名一致</li>'
					+ '</span>'
					+ '</dd>'
					+ '</dl>'
					+ '<dl>'
					+ '<dt><strong>*</strong>证件类型：</dt>'
					+ '<dl class="selects lit2">'
					+ '<dt></dt>'
					+ '<dd>'
					+ '<ul>'
					+ '<li>身份证</li>'
					+ '<li>护照</li>'
					+ '<li>其他</li>'
					+ '</ul>'
					+ '</dd>'
					+ '<input type="text" name="certificationType"  class="showinput idCard" value="身份证" style="width:68px" onblur="flyOrder.certificationTypeSelectChange(this)" >'
					+ '</dl> '
					+ '<input type="text" name="certificationNumber" id="certificationNumber" class="theinput idNum" style="float: left;margin: 0 8px 0 0;" value="" onblur="flyOrder.checkcertificationNumber(this)"/>'
					+ '<span class="show"><span class="yd_help" style="border-bottom:0;padding:0;"><img src="img/1352.png"></span>'
		            + '<ul style="width:428px; height:309px;">'
		            + '<li class="showtitle">证件说明</li>'
		            + '<li class="tableUl">'
		            +   '<ul ><li style="text-align:center;line-height:40px;font-weight:bold">乘车人类型</li>'
		            +    '<li style="font-weight:bold">填写证件类型</li>'
		            +    '<li style="width:120px;font-weight:bold">填写证件号码</li>'
		            +    '<li style="width:120px;font-weight:bold">登车所持证件</li>'
		            +     '<li style="height:189px; line-height: 189px; text-align: center;">成人</li>'
		            +     '<li>身份证</li>'
		            +     '<li style="width:120px;line-height:20px">18位身份证号码，字母大写</li>'
		            +     '<li style="width:120px;">身份证</li>'
		            +     '<li>护照</li>'
		            +     '<li style="width:120px;line-height:20px">与护照号码一致，字母大写</li>'
		            +     '<li style="width:120px;">护照</li>'
		            +     '<li style="height:95px;">其他</li>'
		            +     '<li style="width:120px;height:95px;line-height:20px">与所持证件号码一致，如证件号码中包含中文，仅填写英文与数字部分即可</li>'
		            +     '<li style="width:120px;height:95px;line-height:20px">回乡证、台胞证、居留证、户口本、军官证、港澳通行证、旅行证等航空公司认可的有效证件</li>'
		            +     '<li style="text-align:center; line-height:40px; border-bottom:none">儿童</li>'
		            +     '<li style="border-bottom:none">身份证</li>'
		            +     '<li style="width:120px;line-height:20px;border-bottom:none">8位出生年月日，格式为yyyymmdd</li>'
		            +     '<li style="width:120px;border-bottom:none">户口本</li>'
		            +   '</ul></li></ul></span>'
					+ '</dd>'
					+ '</dl>'
					+ '<dl>'
					+ '<dt>出生日期：</dt>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					 + ' <option value ="1990">1990</option>'
					+ '  <option value ="1991">1991</option>'
					+ '  <option value="1992">1992</option>'
					+ '  <option value="1993">1993</option>'
					+ '</select><span style="float:left;margin-right:5px;">年</span>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '  <option value ="1">1</option>'
					+ '  <option value ="2">2</option>'
					+ '  <option value="3">3</option>'
					+ '  <option value="4">4</option>'
					+ '</select><span style="float:left;margin-right:5px;">月</span>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '  <option value ="1">1</option>'
					+ '  <option value ="2">2</option>'
					+ '  <option value="3">3</option>'
					+ '  <option value="4">4</option>'
					+ '</select><span style="float:left;">日</span>'
				 	+ ' </dl>'
					+ '<dl>'
					+ '	<dt>成本中心：</dt>'
					+ '	<dd>'
					+ '	<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '	  <option value ="财务中心">财务中心</option>'
					+ '	  <option value ="2">2</option>'
					+ '	  <option value="3">3</option>'
					+ '	  <option value="4">4</option>'
					+ '	</select>'
					+ '	<span style="float:left;margin-left:10px;">项目：</span>'
					+ '	<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '	  <option value ="A项目">A项目</option>'
					+ '	  <option value ="B项目">B项目</option>'
					+ '	  <option value="C项目">C项目</option>'
					+ '	  <option value="D项目">D项目</option>'
					+ '	</select></dd>'
					+ ' </dl>'
					+ '</div><script>$(bindSelects);</script>';
			return html;
		 }else{
			 var html = '<div class="myPassengerDiv" id="myPasengerDiv'
				+ count
				+ '" name="personPassenger"><div class="lines"></div>'
				+ '<dl>'
				+ '<dt id="passengerOrderBy">第'
				+ count
				+ '位乘车人：</dt>'
				+ '<dd>'
				+ '<a id="deletAbut" href="javascript:void(0)" onclick="flyOrder.delPasenger(\'\',this);" class="del">删除</a>'
				+ '</dd>'
				+ '</dl>'
				+ '<dl>'
				+ '<dt><strong>*</strong>乘车人姓名：</dt>'
				+ ' <dd>'
				+ '<input type="text" onBlur="flyOrder.changePassengerName(this);" name="passengerName" style="width:95px;margin: 0 8px 0 0;" id="textfield2" class="theinput theinput2" value=""/>'
				+ '<span class="show">'
				+ '<span class="yd_help"> 填写说明</span>'
				+ '<ul>'
				+ '<li class="showtitle">乘客说明</li>'
				+ '<li>1. 乘车人姓名必须与登车所出示证件上的姓名一致</li>'
				+ '<li>2. 如使用中文姓名预订车票且持有护照登车，须确保护照上显示中文姓名</li>'
				+ '<li>3. 持护照登车的乘车人，须严格按照护照上显示的姓名顺序填写（包含中文或英文）</li>'
				+ '<li>4. 如持卡人的姓名中出现生僻字无法输入乘车人姓名，请致电400-77-95568预订车票，并提供生僻字的正确拼音</li>'
				+ '<li>5. 同一订单最多填写9位乘车人，超过此人数订票请拆分填写订单</li>'
				+ '<li>6. 车票预订成功后，姓名不允许变更，如因填写有误导致无法登车，由乘车人自行承担责任</li>'
				+ '</span>'
				+ '</dd>'
				+ '</dl>'
				+ '<dl>'
				+ '<dt><strong>*</strong>证件类型：</dt>'
				+ '<dl class="selects lit2">'
				+ '<dt></dt>'
				+ '<dd>'
				+ '<ul>'
				+ '<li>身份证</li>'
				+ '<li>护照</li>'
				+ '<li>其他</li>'
				+ '</ul>'
				+ '</dd>'
				+ '<input type="text" name="certificationType"  class="showinput idCard" value="身份证" style="width:68px" onblur="flyOrder.certificationTypeSelectChange(this)" >'
				+ '</dl> '
				+ '<input type="text" name="certificationNumber" id="certificationNumber" class="theinput idNum" style="float: left;margin: 0 8px 0 0;" value="" onblur="flyOrder.checkcertificationNumber(this)"/>'
				+ '<span class="show"> <span class="yd_help"> 证件说明</span>'
	            + '<ul style="width:428px; height:309px;">'
	            + '<li class="showtitle">证件说明</li>'
	            + '<li class="tableUl">'
	            +   '<ul ><li style="text-align:center;line-height:40px;font-weight:bold">乘车人类型</li>'
	            +    '<li style="font-weight:bold">填写证件类型</li>'
	            +    '<li style="width:120px;font-weight:bold">填写证件号码</li>'
	            +    '<li style="width:120px;font-weight:bold">登车所持证件</li>'
	            +     '<li style="height:189px; line-height: 189px; text-align: center;">成人</li>'
	            +     '<li>身份证</li>'
	            +     '<li style="width:120px;line-height:20px">18位身份证号码，字母大写</li>'
	            +     '<li style="width:120px;">身份证</li>'
	            +     '<li>护照</li>'
	            +     '<li style="width:120px;line-height:20px">与护照号码一致，字母大写</li>'
	            +     '<li style="width:120px;">护照</li>'
	            +     '<li style="height:95px;">其他</li>'
	            +     '<li style="width:120px;height:95px;line-height:20px">与所持证件号码一致，如证件号码中包含中文，仅填写英文与数字部分即可</li>'
	            +     '<li style="width:120px;height:95px;line-height:20px">回乡证、台胞证、居留证、户口本、军官证、港澳通行证、旅行证等航空公司认可的有效证件</li>'
	            +     '<li style="text-align:center; line-height:40px; border-bottom:none">儿童</li>'
	            +     '<li style="border-bottom:none">身份证</li>'
	            +     '<li style="width:120px;line-height:20px;border-bottom:none">8位出生年月日，格式为yyyymmdd</li>'
	            +     '<li style="width:120px;border-bottom:none">户口本</li>'
	            +   '</ul></li></ul></span>'
				+ '</dd>'
				+ '</dl>'
				+ '<dl>'
					+ '<dt>出生日期：</dt>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					 + ' <option value ="1990">1990</option>'
					+ '  <option value ="1991">1991</option>'
					+ '  <option value="1992">1992</option>'
					+ '  <option value="1993">1993</option>'
					+ '</select><span style="float:left;margin-right:5px;">年</span>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '  <option value ="1">1</option>'
					+ '  <option value ="2">2</option>'
					+ '  <option value="3">3</option>'
					+ '  <option value="4">4</option>'
					+ '</select><span style="float:left;margin-right:5px;">月</span>'
					+ '<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '  <option value ="1">1</option>'
					+ '  <option value ="2">2</option>'
					+ '  <option value="3">3</option>'
					+ '  <option value="4">4</option>'
					+ '</select><span style="float:left;">日</span>'
					+ ' </dl>'
					+ '<dl>'
					+ '	<dt>成本中心：</dt>'
					+ '	<dd>'
					+ '	<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '	  <option value ="财务中心">财务中心</option>'
					+ '	  <option value ="2">2</option>'
					+ '	  <option value="3">3</option>'
					+ '	  <option value="4">4</option>'
					+ '	</select>'
					+ '	<span style="float:left;margin-left:10px;">项目：</span>'
					+ '	<select style="width:95px;margin: 0 8px 0 0;float:left" class="theinput theinput2">'
					+ '	  <option value ="A项目">A项目</option>'
					+ '	  <option value ="B项目">B项目</option>'
					+ '	  <option value="C项目">C项目</option>'
					+ '	  <option value="D项目">D项目</option>'
					+ '	</select></dd>'
					+ ' </dl>'
				 + '</dl>' + '</div><script>$(bindSelects);</script>';
		return html;
		 }
	},
	/**
	 * 乘客姓名change事件 改变头部姓名
	 */
	changePassengerName : function(obj) {
		var v = $.trim($(obj).val());
		if (null != v && "" != v) {
			$(obj).parent().parent().parent().find(
					'em[class="disPassengerName"]').html(v);
		}
		$(obj).parent().find("font").remove();
	},
	/**
	 * 删除乘客
	 */
	delPasenger : function(t, obj) {
		var pasCount = $('body').find('div[class="myPassengerDiv"]').length;
		if (pasCount == 1) {
			alert("订单至少有一个乘车人，不能删除!");
			return false;
		}
		$(".box_red").remove();
		var delObj = $(obj).parent().parent().parent();
		// 点击删除按钮-->同时解除和联系人复选框的绑定
		var idxStr = $(delObj).attr("divIndex");
		if (idxStr != undefined) {
			var idx = idxStr.replace("myPasengerDiv", "");
			$('body').find('input[dIndex="' + idx + '"]').removeAttr("checked");
			$(delObj).removeAttr("divIndex");
		}
		delObj.remove();
		// 删除乘客后 改变现有乘客顺序
		var pasDiv = $('body').find('div[class="myPassengerDiv"]');
		for ( var i = 0; i < pasDiv.length; i++) {
			$(pasDiv[i]).attr("id", "myPassengerDiv" + (i * 1 + 1));
			$(pasDiv[i]).find('dt[id="passengerOrderBy"]').html(
					"第" + (i * 1 + 1) + "位乘车人：");
		}
		// end

		flyOrder.passengerTypeSelectChange();
		// 改变乘客和总票价
		this.changeSumPrice();
		if (pasCount <= 9) {
			$("#addPasengerButton").prop("disabled", false);
			$("#addPasengerButton").attr("class", "train_add");
		}
	},
	/**
	 * 改变客票总价及乘客人数信息
	 */
	changeSumPrice : function() {
		var pcStr = $("#personCount").html();
		var pc = pcStr.substring(0, pcStr.length - 1) * 1;
		var cdStr = $("#childrenCount").html();
		var cd = cdStr.substring(0, cdStr.length - 1) * 1;

		var flyPrice = $("#flyPrice").val() * 1;// 单张车票价格
		var backFlyPrice = $("#backFlyPrice").val() * 1;// 单张返程票价格
		var fuelFee = $("#fuelFee").val() * 1;// 燃油费
		var backFuelFee = $("#backFuelFee").val() * 1;// 返程燃油费
		var airPortFee = $("#airPortFee").val() * 1;// 车建费
		var backAirPortFee = $("#backAirPortFee").val() * 1;// 返程车建费
		var insuranceFee = $("#insuranceFee").val() * 1;// 保险费
		var childrenInsuranceFee = insuranceFee;// 返程保险费

		var childrenFlyPrice = $("#childrenFlyPrice").val() * 1;// 儿童--票面价
		var backChildrenFlyPrice = $("#backChildrenFlyPrice").val() * 1;// 返程儿童--票面价
		var childrenFuelFee = $("#childrenFuelFee").val() * 1;// 儿童--燃油费
		var backChildrenFuelFee = $("#backChildrenFuelFee").val() * 1;// 返程儿童--燃油费
		var childrenAirPortFee = $("#childrenAirPortFee").val() * 1;// 儿童--车建费
		var backChildrenAirPortFee = $("#backChildrenAirPortFee").val() * 1;// 返程儿童--车建费

		// 成人保险数量
		var insuranceCount = $("#selectInsuranceCount").html();
		var ic = insuranceCount.substring(0, insuranceCount.length - 1) * 1;
		// 儿童保险数量
		var childrenInsuranceCount = $("#childrenInsuranceCount").html();
		var cic = childrenInsuranceCount.substring(0,
				childrenInsuranceCount.length - 1) * 1;

		var sumPerson = pc + cd;
		var personprice = flyPrice + fuelFee + airPortFee;
		var childrenprice = childrenFlyPrice + childrenFuelFee
				+ childrenAirPortFee;
		var backPersonprice = backFlyPrice + backFuelFee + backAirPortFee;
		var backChildrenprice = backChildrenFlyPrice + backChildrenFuelFee + backChildrenAirPortFee;

		$("#sumPerson").html(sumPerson);
		//$("#backSumPerson").html(sumPerson);
		// 总票价 -->[(单张票面价+燃油+车建)*成人数量+单人保险*保险数量]+[儿童人数*儿童票价+燃油费+车建费+保险费]
		var personPrice = pc * personprice + ic * 1 * insuranceFee;// 去程成人总票价
		var childrenPrice = cd * childrenprice + cic * insuranceFee;// 去程儿童总票价
		var backPersonprice = pc * backPersonprice + ic * 1 * insuranceFee;// 返程成人总票价
		var backChildrenprice = cd * backChildrenprice + cic * insuranceFee;// 返程儿童总票价
		var iceFee = ic * 1 * insuranceFee;//成人总保险金额
		var ciceFee = cic * insuranceFee;//儿童总保险金额
		// var childrenPrice=childrenPricePercent*1*cd*flyPrice;//儿童总票价
//		$("#sumPrice").html("￥" + (personPrice + childrenPrice));
//		$("#backSumPrice").html("￥" + (backPersonprice + backChildrenprice));
		if($("#backEndCity").val() == ""){
			if($("input[name=dispatchType]").val()=="付费快递邮寄行程单"){
				$("#sumPrice").html("￥" + (personPrice + childrenPrice+$("#tripMoneys").val()*1));
				$("#orderTotalPrice").val(personPrice + childrenPrice+$("#tripMoneys").val()*1);
			}else{
				$("#sumPrice").html("￥" + (personPrice + childrenPrice));
				$("#orderTotalPrice").val(personPrice + childrenPrice);
			}
		}else{
			if($("input[name=dispatchType]").val()=="付费快递邮寄行程单"){
				$("#sumPrice").html("￥" + (personPrice + childrenPrice + backPersonprice + backChildrenprice+$("#tripMoneys").val()*1));
				$("#orderTotalPrice").val(personPrice + childrenPrice + backPersonprice + backChildrenprice+$("#tripMoneys").val()*1);
			}else{
				$("#sumPrice").html("￥" + (personPrice + childrenPrice + backPersonprice + backChildrenprice));
				$("#orderTotalPrice").val(personPrice + childrenPrice + backPersonprice + backChildrenprice);
			}
		}
		$("#orderTotalCount").val(sumPerson);
		$("#orderTotalPerson").val(pc);
		$("#orderTotalChildPerson").val(cd);
		$("#orderPersonInsurance").val(ic);
		$("#orderChildInsurance").val(cic);
		$("#orderPersonInsuranceFee").val(iceFee);
		$("#orderChildInsuranceFee").val(ciceFee);
	},
	
	getPassengerDivText:function(){
		var pasCount = $('body').find('div[class="myPassengerDiv"]');
	    var barkStr = "";
		for ( var i = 0; i < pasCount.length; i++) {
			var pName = $(pasCount[i]).find('input[name="passengerName"]')
			             .val();// 乘车人姓名
	        var pNo = $(pasCount[i]).find('input[name="certificationNumber"]')
			             .val();// 乘车人证件号码
	        var pTypoe = $(pasCount[i]).find('input[name="passengerType"]')
                         .val();// 乘车人类型
	        var cType = $(pasCount[i]).find('input[name="certificationType"]')
                          .val();// 证件类型
	        var insurance = $(pasCount[i]).find('input[name="insurance"]')
                          .val();// 保险份数
	        barkStr += pName + "," + pNo + "," + pTypoe + "," + cType + "," + insurance.replace(" ","") + "," +$(pasCount[i]).attr("divIndex");
	        if(i+1 < pasCount.length){
	        	barkStr += "=";
	        }
		}
		$("#barkStr").val(barkStr);
		//alert(barkStr);
	},
	/**
	 * 查找乘客相关值为空的DIV
	 */
	getEmptyPassengerDiv : function() {
		var pasCount = $('body').find('div[class="myPassengerDiv"]');
		var idx = -1;
		for ( var i = 0; i < pasCount.length; i++) {
			var pName = $(pasCount[i]).find('input[name="passengerName"]')
					.val();// 乘车人姓名
			var pNo = $(pasCount[i]).find('input[name="certificationNumber"]')
					.val();// 乘车人证件号码
			if (($.trim(pName) == null || $.trim(pName) == "")
					&& ($.trim(pNo) == null || $.trim(pNo) == "")) {
				idx = i;
				break;
			}
		}
		if (idx == -1) {
			return -1;
		}
		return pasCount[idx];
	},
	/**
	 * 查找乘客相关值为第一个 
	 */
	getEmptyPassengerDivOne : function() {
		var pasCount = $('body').find('div[class="myPassengerDiv"]');
		return pasCount[0];
	},
	/**
	 * 动态添加乘客DIV
	 */
	addPasengerDiv : function() {
		var seat = $("#seatNum").val();
		var searNum = 9;
		if(seat!=""&&seat*1<9){
			searNum=seat*1
		}
		var memberPayNum = $("#memberPayNum").val();
		var obj = $("#addPasengerDl");
		var pasCount = $('body').find('div[class="myPassengerDiv"]').length;
		if("1"==memberPayNum&&pasCount>0){
			alert("温馨提示：已达到活动名额上限，不可再次添加");
			return false;
		}
		if("2"==memberPayNum&&pasCount>1){
			alert("温馨提示：已达到活动名额上限，不可再次添加");
			return false;
		}
		if (pasCount == searNum) {
			alert("此订单现在支持最多乘车人为"+searNum+"人！");
			return false;
		}
		var html = flyOrder.getPasengerHmtl(pasCount + 1);
		// 添加乘客DIV
		$(html).insertBefore(obj);
		$(showTip);
		flyOrder.passengerTypeSelectChange();
		if (pasCount >= searNum-1) {
			$("#addPasengerButton").attr("disabled", "disabled");
			$("#addPasengerButton").attr("class", "noAdd");
			if(searNum==9){
				var str = "<span class='box_red' style='width:335'><h6 class='prompt_s prompt_s1'>此订单最多添加"+searNum+"位乘车人，超过此人数请拆分填写订单</h6></span>";
			}else{
				//var str = "<span class='box_red' style='width:335'><h6 class='prompt_s prompt_s1'>此航班舱位仅剩"+searNum+"个座位，最多添加"+searNum+"位乘车人</h6></span>";
				var str = "<span class='box_red' style='width:335'><h6 class='prompt_s prompt_s1'>剩余票量已满，如还有其他随行人员请预订其他舱位客票或更换航班</h6></span>";
			}
			
			$("#addPasengerButton").parent().append(str);
		}
		this.changeSumPrice();
	},
	/**
	 * 根据证件类型 获取证件类型名称 ---->具体值待定 注 此处不存在证件类型错误的情况
	 */
	getCertificationType : function(typeValue) {
		var certificationType = "";
		if (typeValue == "00") {
			certificationType = "身份证"
		}
		if (typeValue == "01") {
			certificationType = "护照"
		}
		if (typeValue == "09") {
			certificationType = "其他"
		}
		return certificationType;
	},
	/**
	 * 乘客类型变化 触发 订单价格和人数变化
	 */
	passengerTypeSelectChange : function(obj) {
		// 成人乘客数量
		var personCount = $("[name='personPassenger']");
		var personInsurance = $("[min='personInsurance']");
		var childrenCount = $("[name='childrenPassenger']");
		var childrenInsurance = $("[min='childrenInsurance']");
		var a = personCount.length;
		$("#personCount").html(personCount.length + '人');
		$("#childrenCount").html(childrenCount.length + '人');
		$("#backPersonCount").html(personCount.length + '人');
		$("#backChildrenCount").html(childrenCount.length + '人');
		var backFlyPrice = $("#backFlyPrice").val() * 1;
		if(backFlyPrice==0){
			$("#selectInsuranceCount").html(personInsurance.length + '份');
			$("#childrenInsuranceCount").html(childrenInsurance.length + '份');
		}else{
			$("#selectInsuranceCount").html(personInsurance.length + '份');
			$("#childrenInsuranceCount").html(childrenInsurance.length + '份');
			$("#backSelectInsuranceCount").html(personInsurance.length + '份');
			$("#backChildrenInsuranceCount").html(childrenInsurance.length + '份');
		}
		if (childrenCount.length == 0) {
			$("[name='childrenTicket']").attr("style", "display:none;");
		} else {
			$("[name='childrenTicket']").attr("style", "display:''");
		}
		if (personCount.length == 0) {
			$("[name='personTicket']").attr("style", "display:none;");
		} else {
			$("[name='personTicket']").attr("style", "display:''");
		}
		// 改变乘客和总票价
		flyOrder.changeSumPrice();
	},
	certificationTypeSelectChange : function(obj) {

	},
	insuranceSelectChange : function(obj) {
		if ($(obj).html().replace(" ","") == '1份' || $(obj).html().replace(" ","") == '2份') {
			// 改变保险数量
			if ($(obj).parent().parent().parent().parent().parent().parent()
					.find('input[name="passengerType"]').val() == '成人') {
				$(obj).parent().parent().parent().find(
						'input[name="insurance"]').attr("min",
						"personInsurance");
			} else if ($(obj).parent().parent().parent().parent().parent()
					.parent().find('input[name="passengerType"]').val() == '儿童') {
				$(obj).parent().parent().parent().find(
						'input[name="insurance"]').attr("min",
						"childrenInsurance");
			}
		} else {
			// 改变保险数量
			$(obj).parent().parent().parent().find('input[name="insurance"]')
					.attr("min", "insurance");
		}
		flyOrder.passengerTypeSelectChange();
		flyOrder.changeSumPrice();
	},
	dispatchTypeSelectChange : function(obj) {
		if ($(obj).val() != '01') {
			$("#addressDiv").css("display", "block");
		} else {
			$("#addressDiv").css("display", "none");
		}
	},
	checkchildren : function() {
		var mark = true;
		$("[name='childrenPassenger']").each( function() {
			var obj = $(this).parent().parent().find(
					"[name='certificationNumber']").val();
			obj = obj.substr(0, 4) + "/" + obj.substr(4, 2) + "/"
					+ obj.substr(6, 2);
			childbir = new Date(obj);
			var obj1 = $("#departureDate").val();
			var reg = new RegExp("-", "g");
			obj1 = obj1.replace(reg, "/");
			var departureDate = new Date(obj1);
			var childmin = childbir.setFullYear(childbir.getFullYear() + 2);
			var childmax = childbir.setFullYear(childbir.getFullYear() + 12);
			if (departureDate.getTime() > childmax
					|| departureDate.getTime() < childmin) {
				var missage = "<font color='red'>儿童年龄必须大于2周岁小于12周岁！</font>";
				$(this).parent().parent().find("[name='certificationNumber']").focus();
				//alert("儿童年龄必须大于2周岁小于12周岁！");
				$(missage).appendTo(
						$(this).parent().parent().find(
								"[name='certificationNumber']"));
				mark = false;
				
				return false;
				
			}
		});
		return mark;
	},
	checkcertificationNumber : function(obj) {
	    var certificationNumber = $(obj).val();
	    /*var passengerType = $(obj).parent().parent().find('input[name="passengerType"]').val();*/
	    var passengerType = $(obj).parents('.myPassengerDiv').find('input[name="passengerType"]').val();
	    var cerType = $(obj).parent().find('input[name="certificationType"]').val();
	    var departureTime = $("[name=departureDate]").val();
	    var departureTimeStr = departureTime.toString();
	    var year = departureTimeStr.substring(0,4);
	    var month = departureTimeStr.substring(5,7);
	    var day = departureTimeStr.substring(8,10);
	    var departureTi = new Date(year,(month-1),day);
	    var myReg = /^\d{17}(\d|X|x)$/;
	    var myReg1 = /^(\d){8}$/;
	    //var cerType = $(obj).find('input[name="certificationType"]').val();
	    if(passengerType == "成人"){
	    	if(cerType == "身份证"){
	    	if(myReg.test(obj.value) == false){
	    		alert("您的身份证号码格式有误!");
				$(obj).attr("value","");
				//obj.focus();
				return false;
	    		}
	    	
	    	var birthTimeStr = certificationNumber.substring(6, 10) + "-" + certificationNumber.substring(10, 12) + "-" 
	    	                   + certificationNumber.substring(12, 14);
	    	var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
	    	var birthLong = birthTime.getTime();
	    	var departureLong = departureTi.getTime();
	    	//判断身份证号码生日
	    	var birthYear = certificationNumber.substring(6, 10);
	    	var birthMonth = certificationNumber.substring(10, 12);
	    	var birthDay = certificationNumber.substring(12, 14);
	    	
	    	if(birthTime.getFullYear()!=birthYear || birthTime.getDate()!=birthDay){
	    		alert("您的身份证号码生日有误!");
	    		$(obj).attr("value","");
				//obj.focus();
				return false;
	    	}
	    	//判断年龄
	    	var thisLong = new Date("2012-10-10".replace(/-/g, "/")).getTime() - new Date("2000-10-10".replace(/-/g, "/")).getTime();
	    	if((departureLong-birthLong) < thisLong){
	    		alert("成人年龄必须大于等于12岁");
	    		$(obj).attr("value","");
				//obj.focus();
				return false;
	    		
	    	}
	    	}
	    }else{
	    	if(cerType == "身份证"){
	    	if(myReg1.test(obj.value) == false){
	    		alert("您的身份证号码格式有误!");
	    		$(obj).attr("value","");
				//obj.focus();
				return false;
	    	}
	    	var birthTimeStr = obj.value.substring(0, 4) + "-" + obj.value.substring(4, 6) + "-" 
	    	                   + obj.value.substring(6, 8);
	    	var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
	    	var childmin = birthTime.setFullYear(birthTime.getFullYear() + 2);
	    	var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
			var childmax = birthTime.setFullYear(birthTime.getFullYear() + 12);
			var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
			
			//判断身份证号码生日
			var birthYear = obj.value.substring(0, 4);
	    	var birthMonth = obj.value.substring(4, 6);
	    	var birthDay = obj.value.substring(6, 8);
	    	
			//判断年龄
			if (departureTi.getTime() >= childmax || departureTi.getTime() < childmin) {
				alert("儿童年龄必须大于2周岁小于12周岁！");
				//obj.focus();
				$(obj).attr("value","");
				return false;
			}
			
			if(birthTime.getFullYear()!=birthYear || birthTime.getDate()!=birthDay){
	    		alert("您的身份证号码生日有误!");
	    		$(obj).attr("value","");
				//obj.focus();
	    		return false;
	    	}
	    	}
	    }
	    
	},
	
	
	
	checkcertificationNumber4commonTripperInfo : function(obj) {
	    var certificationNumber = $("[name=certificationNumber]").val();
	    var certificationType = $("[name=certificationType]").val();
	    var myReg = /^\d{17}(\d|X|x)$/;
	    
	    if(certificationType == "身份证"){
	    	if(myReg.test(obj.value) == false){
	    		alert("您的身份证号码格式有误!");
				$(obj).attr("value","");
				//obj.focus();
				return false;
	    	}
	    	
	    	
	    	
	    	var birthTimeStr = certificationNumber.substring(6, 10) + "-" + certificationNumber.substring(10, 12) + "-" 
	    	                   + certificationNumber.substring(12, 14);
	    	var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
	    	//判断身份证号码生日
	    	var birthYear = certificationNumber.substring(6, 10);
	    	var birthMonth = certificationNumber.substring(10, 12);
	    	var birthDay = certificationNumber.substring(12, 14);
	    	
	    	if(birthTime.getFullYear()!=birthYear || birthTime.getDate()!=birthDay){
	    		alert("您的身份证号码生日有误!");
	    		//$("[name=certificationNumber]").focus();
				$("[name=certificationNumber]").attr("value","");
				return false;
	    	}
	    }
	},
	checklinkerPhone : function() {
		var linkerPhone = $("[name=linkerPhone]").val();
		var myReg = /^1(\d){10}$/;
		if(myReg.test(linkerPhone)==false){
			alert("电话号码必须是以1开头的11位的数字!");
			//$("[name=linkerPhone]").focus();
			$("[name=linkerPhone]").attr("value","");
		}
	},
	/**
	 * @param	departureDate 起飞日期yyyy-MM-dd HH:mm:ss
	 * @param	childrenNum	儿童证件号(yyyymmdd)
	 * @return	ture儿童 false非儿童
	 */
	checkChildrenAge:function(departureDate,childrenNum){
		var departureTimeStr = departureDate.toString();
	    var year = departureTimeStr.substring(0,4);
	    var month = departureTimeStr.substring(5,7);
	    var day = departureTimeStr.substring(8,10);
	    var departureTi = new Date(year,(month-1),day);
	    
	    
	    var birthTimeStr = childrenNum.substring(0, 4) + "-" + childrenNum.substring(4, 6) + "-" 
        + childrenNum.substring(6, 8);
		var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
		var childmin = birthTime.setFullYear(birthTime.getFullYear() + 2);
		var birthTime = new Date(birthTimeStr.replace(/-/g,"/"));
		var childmax = birthTime.setFullYear(birthTime.getFullYear() + 12);
		
		//判断儿童年龄
		if (departureTi.getTime() >= childmax || departureTi.getTime() < childmin) {
			//儿童年龄必须大于2周岁小于12周岁
			return false;
		}else{
			return true;
		}
	}
}
