var client = new Keen({
    projectId: statsID,
    readKey: statsKey
});

var timeframeCombined = "this_"+timeframeNumber.toString()+"_"+timeframeScale;

Keen.ready(function()
{
    var maxTotal = new Keen.Query("maximum", {
        eventCollection: "userbase",
        targetProperty: "totalBigChat",
        interval: interval,
        timeframe: timeframeCombined
    });
    var avgTotal = new Keen.Query("average", {
        eventCollection: "userbase",
        targetProperty: "totalBigChat",
        interval: interval,
        timeframe: timeframeCombined
    });
    var maxActive = new Keen.Query("maximum", {
        eventCollection: "userbase",
        targetProperty: "activeBigChat",
        interval: interval,
        timeframe: timeframeCombined
    });
    var avgActive = new Keen.Query("average", {
        eventCollection: "userbase",
        targetProperty: "activeBigChat",
        interval: interval,
        timeframe: timeframeCombined
    });
    
    var chart = new Keen.Dataviz()
    .el(document.getElementById("graph"))
    .height(500)
    .chartType("linechart")
    .chartOptions({
        backgroundColor: (theme == "day" ? "#fff" : "#222"),
        chartArea: {
            width: "77%",
            left: 20
        },
        hAxis: {
            textStyle: { color: (theme == "day" ? "#000" : "#fff") },
            viewWindowMode: "maximized",
            format:"d-MMM-yy",
            slantedText: true,
            gridlines:  { count: timeframeNumber }
        },
        vAxis: {
            textStyle: { color: (theme == "day" ? "#000" : "#fff") },
            minValue: 0,
            format: "###"
        },
        legend: {
            textStyle: { color: (theme == "day" ? "#000" : "#fff") }
        },
        title: "Sleepychat Userbase",
        titleTextStyle: { color: (theme == "day" ? "#000" : "#fff") }
    })
    .prepare();
    
    client.run([maxTotal, avgTotal, maxActive, avgActive], function(err, res){ // run the queries
        
        if(err)
        {
            chart.error(err.message);
            return;
        }
        
        var result1 = res[0].result  // data from first query
        var result2 = res[1].result  // data from second query
        var result3 = res[2].result  // data from second query
        var result4 = res[3].result  // data from second query
        var data = []  // place for combined results
        var i=0
        
        while (i < result1.length) {
            
            data[i]={ // format the data so it can be charted
                timeframe: result1[i]["timeframe"],
                value: [
                    { category: "Max Total", result: result1[i]["value"] },
                    { category: "Avg Total", result: result2[i]["value"] },
                    { category: "Max Active", result: result3[i]["value"] },
                    { category: "Avg Active", result: result4[i]["value"] }
                ]
            }
            if (i == result1.length-1) { // chart the data
                chart.parseRawData({ result: data }).render();
            }
            i++;
        }
    });
});