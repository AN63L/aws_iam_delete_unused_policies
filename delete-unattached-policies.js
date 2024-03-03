// This script lists all the customer managed policies
// In the list functions, it will filter for all the unattached policies
// these policies are then deleted
//////////
////////// AWS's response to listing policies is buggy at best, even with the loop there can be missing deleted policies. 
////////// PLEASE RUN THIS SCRIPT MORE THAN ONCE TO ENSURE INTENDED PURPOSE
//////////
const aws = require('aws-sdk');
// Set the region
aws.config.update({ region: 'eu-west-1' });
var iam = new aws.IAM();


async function list(marker) {

    var policyNames = [];
    var response = [];
    if (marker === null){
        var params = {
            Scope: 'Local',
            OnlyAttached: false,
        }
    } else {
        var params = {
            Scope: 'Local',
            OnlyAttached: false,
            Marker: marker,
        }
    }
    
    var policies = await iam.listPolicies(params).promise();
    console.log('all customer managed policies: ', policies);
    var length = (policies.Policies).length;
    console.log('# of customer managed policies: ', length);
    for (let i = 0; i < length; i++){
        // if not attached, add name to policyNames array
        if (policies.Policies[i].AttachmentCount === 0){
            policyNames.push(policies.Policies[i]);
        } else {
            // console.log('Policy is attached to entity... ignore.');
        }
    }

    // NOT ALL POLICIES ARE READ AT ONCE 
    // YOU HAVE TO LOOP THROUGH THEM TO ENSURE THEY ARE ALL DELETED
    // THE MARKER PROVIDED INDICATES WHERE TO START FROM AGAIN
    response.push(policyNames);
    if (policies.IsTruncated === true){
        response.push(policies.Marker);
    } else {
        response.push(null);
    }
    return response;

} 

async function run(marker) {
    try {
        var temp = await list(marker);
        var marker = temp[1];
        var policyNames = temp[0];
        
        console.log('policy names: ', policyNames);
        var length = policyNames.length;
        console.log('# of unattached policies: ', length);
        for (let j = 0; j < length; j++){
            var versions = parseInt((policyNames[j].DefaultVersionId).replace('v', ''));
            if ( versions !== 1){
                console.log('more than one policy version detected !');
                for (let k = 1; k < versions; k++){
                    console.log('deleting version : ', k);
                    var params = {
                        PolicyArn: policyNames[j].Arn,
                        VersionId: 'v' + k.toString()
                    }
                    var deleteResponse = await iam.deletePolicyVersion(params).promise();
                    console.log('delete version response: ', deleteResponse);
                }
            }
            var response = await iam.deletePolicy({PolicyArn: policyNames[j].Arn}).promise();
            console.log('response to deletion: ', response);
            console.log('deleted policy: ', policyNames[j].PolicyName);
            console.log('\n');
        }
        if (marker !== null){
            run(marker);
        } else {
            return;
        }
    } catch (error){
        console.log('ERROR ====> \n', error);
    }
}

run(null)
