const express=require('express')
const jsforce=require('jsforce')
const {google} =require("googleapis")
const { userInfo } = require('os')
require('dotenv').config()
const app=express()
const PORT=6001

const {SF_LOGIN_URL, SF_USERNAME, SF_PASSWORD, SF_TOKEN} = process.env
const conn = new jsforce.Connection({
    loginUrl:SF_LOGIN_URL
})
conn.login(SF_USERNAME, SF_PASSWORD+SF_TOKEN,(err, userInfo)=>{
    if(err){
        console.error(err)
    }else{
        console.log("User Id: "+ userInfo.id)
        console.log("Org Id:"+ userInfo.organizationId)
    }

})

app.get('/',async(req,res)=>{
    //sheets part
    const auth= new google.auth.GoogleAuth({
        keyFile:"sheetcred.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    //client instance of the auth
    const client= await auth.getClient();

    //instance of google sheets api
    const googleSheets=google.sheets({version:"v4", auth: client});
    //url name after d ad before edit
    const spreadsheetId='1C3ATdyspDheH7A5tgNqV4_zlSfeViO9sDlfjpuDmNU4'
    //get data from sheet
    const metaData = await googleSheets.spreadsheets.get({
        auth,
        spreadsheetId,
      });

      //soql part
    var records = [];
    // records.push({Name:'Account Name',Phone:'Phone',AccountNumber: 'Account Number', Website:'Website', type:'Type', Ownership:'Ownership',Industry:'Industry'});
    var query = conn.query("SELECT Name, Phone, AccountNumber, Website, Type, Ownership, Industry FROM Account")
    .on("record", function(record) {
        records.push(record);
    })
    .on("end", async function() {
        console.log("total in database : " + query.totalSize);
        console.log("total fetched : " + query.totalFetched);

        await googleSheets.spreadsheets.batchUpdate({
            auth: auth,
            spreadsheetId: spreadsheetId,
            resource: {
              "requests": 
              [
                {
                  "deleteRange": 
                  {
                    "range": 
                    {
                      "sheetId": 0, // gid
                      "startRowIndex": 1,
                      "endRowIndex": 1000
                    },
                    "shiftDimension": "ROWS"
                  }
                }
              ]
            }
          })

        for(let i=0;i<records.length;i++){
            console.log(records[i].Name,records[i].Phone,records[i].AccountNumber,records[i].Website,records[i].Type,records[i].Ownership,records[i].Industry);
        
        await googleSheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: "Sheet1!A:G",
            valueInputOption: "USER_ENTERED",
            resource: {
              values: [
                //   [request, name]
                [records[i].Name,records[i].Phone,records[i].AccountNumber,records[i].Website,records[i].Type,records[i].Ownership,records[i].Industry]
                
                ],
            },
          });
        }
        res.json(records)
    })
    .on("error", function(err) {
        console.error(err);
    })
    .run({ autoFetch : true, maxFetch : 4000 }); // synonym of Query#execute();
    
    // res.send("Loading...")
})
app.listen(PORT,()=>{
    console.log('Server running')
})