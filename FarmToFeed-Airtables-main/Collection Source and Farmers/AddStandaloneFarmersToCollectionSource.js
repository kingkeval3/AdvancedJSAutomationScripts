//configure golbal-variables
let inputConfig = input.config()

let farmerRecordId = inputConfig.farmerRecordId
let farmerName = inputConfig.farmerName
let farmerPhone = inputConfig.farmerPhone
let farmerCollectionSource = inputConfig.farmerCollectionSource
let farmerContact = inputConfig.farmerContact
let farmerReference = inputConfig.farmerReference
let farmerLocationName = inputConfig.farmerLocationName
let farmerIsPrimary = inputConfig.farmerIsPrimary
let farmerType = inputConfig.farmerType
let farmerEmail =  inputConfig.farmerEmail

//fetch required table(s)
let contactListTable = base.getTable('Contact List')
let collectionSourceTable = base.getTable('Collection Source')

//Constants
const idKey = 'id'
const nameKey = 'name'

//Contact List table constants
const contactNameHeaderFrmContactList = 'Contact Name'
const contactNoHeaderFrmContactList = 'Contact Number'
const roleHeaderFrmContactList = 'Role'
const farmerContactHeaderFrmContactList = 'Is Farmer Contact?'
const collectorRoleFieldValue = 'Collector'
const enumeratorRoleFieldValue = 'Enumerator'
const emailHeaderFrmContactList = 'Email'

//Collection Source table constants
const collectionSourceNameFieldFrmCollectionSource = 'Collection Source Name'
const typeFieldFrmCollectionSource = 'Type'
const contactDetailsFieldFrmCollectionSource = 'Contact Details'
const farmersFieldFrmCollectionSource = 'Farmers'


let collectionSourceCreateOrUpdateObj = {}

if(checkIfArrayNullOrEmpty(farmerCollectionSource)){

    //collect contact info of farmer
    let contactDetailsArr = []

    if(checkIfArrayNullOrEmpty(farmerContact)){

        let farmerContactId = await contactListTable.createRecordAsync(createFarmerContactCreateObj())

        contactDetailsArr.push(
            createKeyValuePairObj(idKey,farmerContactId)
        )

    }

    //add reference as contact in collection-source
    if(!checkIfArrayNullOrEmpty(farmerReference)){
        contactDetailsArr.push(createKeyValuePairObj(idKey,farmerReference[0]))
    }

    if(contactDetailsArr.length>0){
        collectionSourceCreateOrUpdateObj[contactDetailsFieldFrmCollectionSource] = contactDetailsArr
    }

    //add collection source name
    if(!checkIfArrayNullOrEmpty(farmerLocationName)){
        collectionSourceCreateOrUpdateObj[collectionSourceNameFieldFrmCollectionSource] = farmerLocationName[0]
    }

    //tag farmer
    collectionSourceCreateOrUpdateObj[farmersFieldFrmCollectionSource] = [createKeyValuePairObj(idKey,farmerRecordId)]

    //collection-source type
    collectionSourceCreateOrUpdateObj[typeFieldFrmCollectionSource] = createKeyValuePairObj(nameKey,farmerType)

    
    if(Object.keys(collectionSourceCreateOrUpdateObj).length > 0){
        await collectionSourceTable.createRecordAsync(collectionSourceCreateOrUpdateObj)
    }
}


function createKeyValuePairObj(key,value){
    let keyValueObj = {}
    keyValueObj[key] = value
    return keyValueObj
}

function checkIfArrayNullOrEmpty(arr){
    return arr==null || (arr!=null && !(arr.length>0))
}

function createFarmerContactCreateObj(){
    let farmerContactCreateObj = {}
    farmerContactCreateObj[contactNameHeaderFrmContactList] = farmerName
    farmerContactCreateObj[contactNoHeaderFrmContactList] = farmerPhone
    farmerContactCreateObj[roleHeaderFrmContactList] = createKeyValuePairObj(nameKey,collectorRoleFieldValue)
    farmerContactCreateObj[farmerContactHeaderFrmContactList] = [createKeyValuePairObj(idKey,farmerRecordId)]
    farmerContactCreateObj[emailHeaderFrmContactList] = farmerEmail
    return farmerContactCreateObj
}