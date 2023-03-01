// Airtable Auto-Number that resets every year script (Ver. 2.0, Added reset monthly and daily)

// Adding the following Inputs: 
// createdRecord: The record ID, trimmed, of the record that was created
// recordDate: The date of the record that was in the creation trigger


//----Configuration
let configTable = "Expenses Register"; //The name of the table that contains the fields
let configDateField = "QB Date"; //Enter the field name, needs to be the date created
let configYearAutonumberField = "Sequence Number"; //Enter the field name, This is the single line text that shows the sequence number for that period
let qbSequenceCodeField = "QB Code";
//let configNumberOfDigits = 3; //The number of digits the output number needs to be. ( ex: "001" instead of just "1" )
let configResetTime = "M"; //Y = Yearly, M = Monthly, D = Daily

//----Variables
let inputConfig = input.config();
let createdRecord = inputConfig.createdRecordId;
let createdDate = inputConfig.recordDate;

let createdYear = new Date(createdDate).getFullYear();
//createdYear = createdYear.getFullYear();

let createdMonth = new Date(createdDate).getMonth() + 1;
//createdMonth = createdMonth.getMonth() + 1;

let createdDay = new Date(createdDate).getDate();
//createdDay = createdDay.getDate();

//----Grab our project records
let table = base.getTable(configTable);
let queryResult = await table.selectRecordsAsync({
    fields: [configDateField, configYearAutonumberField],
    sorts: [{
            field: configDateField,
            direction: "desc"
        },
        {
            field: configYearAutonumberField,
            direction: "desc"
        }
    ]
});

//----Create our list for creating our next number, filter out other years/months/days
let checkRecords = new Array();
let projectYear = undefined;
let projectID = "";
let projectMonth = undefined;
let projectDay = undefined;

for (let record of queryResult.records) {
    let curRecordDate = record.getCellValueAsString(configDateField)

    projectYear = new Date(curRecordDate).getFullYear();
    projectMonth = new Date(curRecordDate).getMonth() + 1;
    projectDay = new Date(curRecordDate).getDate();

    projectID = record.getCellValueAsString(configYearAutonumberField);

    if (configResetTime == "Y") {
        if (projectYear == createdYear) {
            if (projectID !== "") {
                checkRecords.push(projectID);
            }
        }
    } else if (configResetTime == "M") {
        if (projectMonth == createdMonth) {
            if (projectID !== "") {
                checkRecords.push(projectID);
            }
        }
    } else if (configResetTime == "D") {
        if (projectDay == createdDay) {
            if (projectID !== "") {
                checkRecords.push(projectID);
            }
        }
    }
}
//----Generate our new number with max of 3 digits
let newNumber = 1;
if (!(checkRecords === undefined || checkRecords.length == 0)) {
    newNumber = parseInt(checkRecords[0]) + 1;
}

let newNumberStr = newNumber.toString();

if (newNumber < 10) {
    newNumberStr = "00" + newNumber
}

if (newNumber >= 10 && newNumber < 100) {
    newNumberStr = "0" + newNumber
}

if (newNumber >= 100 && newNumber <= 1000) {
    newNumberStr = newNumber.toString()
}

/*    while( newNumberStr.length != configNumberOfDigits ){
        newNumberStr = "0" + newNumber
    }*/

let qbSequenceCode = createdYear + "-" + (createdMonth < 10 ? "0" + createdMonth : createdMonth) + "-" + newNumberStr;
//Update our record
await table.updateRecordAsync(createdRecord, {
    [configYearAutonumberField]: newNumberStr,
    [qbSequenceCodeField]: qbSequenceCode
})