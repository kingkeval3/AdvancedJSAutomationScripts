//Get input config (input variables) object
let inputConfig = input.config();

//If Deal Status has been updated to status Won only proceed further
if (inputConfig.dealStatus === 'WON') {
    //Fetch tables Leads, Customers and F2F Accounting Managers
    let leadsTable = base.getTable("Leads");
    let customersTable = base.getTable("Customers");
    let f2fAccountManagers = base.getTable('F2F Accounting Managers')

    //Fetch required fields from input config to create new record for customers table
    let leadRecordId = inputConfig['recordId']
    let leadCompanyName = inputConfig['companyName']
    let leadContactName = inputConfig['contactName']
    let leadOwner = inputConfig['leadOwner']
    let leadContactNumber = inputConfig['contactNumber']
    let leadDateOfLastContact = inputConfig['dateOfLastContact']

    //Loop throw F2F Accounting Managers and set linked field record id
    let leadOwnerId = undefined

    if (leadOwner.length > 0) {

        var f2fAccountManagersRecords = await f2fAccountManagers.selectRecordsAsync({
            fields: ['Name']
        });

        for (let curRecord of f2fAccountManagersRecords.records) {
            //Match the records by that field
            if (curRecord.getCellValueAsString("Name") == leadOwner[0]) {
                leadOwnerId = curRecord.id;
                break;
            }
        }
    }

    //Create record in customer table    
    let customerCreationRecordId = await customersTable.createRecordAsync({
        "CUSTOMER": leadCompanyName,
        "CONTACT PERSON": leadContactName,
        "TEL NUMBER": leadContactNumber,
        "CUSTOMER SINCE": leadDateOfLastContact
    })

    //If linked field value exists, update the same in customers table
    if (leadOwnerId != undefined) {
        await customersTable.updateRecordsAsync([{
            "id": customerCreationRecordId,
            fields: {
                "REL MANAGER": [{
                    id: leadOwnerId
                }]
            }
        }])
    }

    //Delete the current record from Leads Table
    await leadsTable.deleteRecordAsync(leadRecordId)
}