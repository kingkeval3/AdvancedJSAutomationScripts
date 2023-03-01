//sync async
const prepareRecordsArrayMap = async (recordIdList, keyList, table) => {
    let farmerRecordsMapArr = [];

        if (recordIdList.length > 0 && keyList.length > 0) {

        let tableRecords = await table.selectRecordsAsync({
            fields: keyList,
            recordIds: recordIdList
        })



        for (let curRecord of tableRecords.records) {
            let recordsMap = new Map()

            keyList.forEach((curKey) => {

                recordsMap.set(
                    curKey,
                    curRecord.getCellValue(curKey)
                )
            })

            farmerRecordsMapArr.push(recordsMap)
        }
    }

}

let farmerRecordsList = await prepareRecordsArrayMap(inputConfig.farmerRecordIds, requiredColumnsFrmFarmers, farmersTable)

//convert to records array map
function convertToRecordsArrayMap(inputConfigMap) {

    let recordsMap = new Map()

    inputConfigMap.forEach((value, key) => {

        for (let i = 0; i < value.length; i++) {

            let currentRecordDetails = recordsMap.has(i) ? recordsMap.get(i) : new Map()

            currentRecordDetails.set(key, value[i])

            recordsMap.set(i, currentRecordDetails)
        }
    })
    return [...recordsMap.values()]
}


fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", { method: "GET", headers: { "Content-Type": "application/json", Authorization: "Basic QVFOcU52Q0lnZUFZS1E2YjZCbFVha0duc0ZlY2RQTFM6VTdwblJObjQzUUdValJQRw==" } })
  .then(function (res) {
    return res.json();
  })
  .then(function (body) {
    var output = { rawHTML: body.access_token };
    fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      body: '{\n"BusinessShortCode": "3002161",\n"Amount": 1,\n"PartyA": "7022140187",\n"PartyB": "3002161",\n"PhoneNumber": "7022140187",\n"CallBackURL": "https://webhook.site/e1e71f8a-98a4-4977-aa07-5b8b5565ef59",\n"AccountReference": "Tushop",\n"passKey": "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",\n"TransactionType": "CustomerPayBillOnline",\n"TransactionDesc": "Test",\n}',
      headers: { "Content-Type": "application/json", Authorization: body.access_token }
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (body) {
        console.log(body);
        callback(null, { rawHTML: body });
      })
      .catch(callback);
    callback(null, output);
  });