const express = require('express')
const fs = require('fs');
const xml2js = require('xml2js');
const app = express()
const port = 3000

//npm install express xml2js
//npm install nodemon --save-dev
//삼성E&A
//00126308

/*1분기보고서 : 11013
반기보고서 : 11012 
3분기보고서 : 11014
사업보고서 : 11011
*/
// XML 파일 경로
const xmlFilePath = './CORPCODE.xml';

// XML 파일 읽기
fs.readFile(xmlFilePath, 'utf8', (err, xmlData) => {
  if (err) {
    console.error(err);
    return false;
    //return res.status(500).send('XML 파일 읽기 오류');
  }

  // XML을 JSON으로 변환
  xml2js.parseString(xmlData, (err, result) => {
    if (err) {
      console.error(err);
      return false;
      //return res.status(500).send('XML 파싱 오류');
    }

    // corp_name으로 검색
    const lists = result.list;
    const foundCorp = lists.find(item => item.corp_name[0] === corpName);
    console.log(foundCorp);

    if (foundCorp) {
      const corpCode = foundCorp.corp_code[0];
      console.log(`corp_code: ${corpCode}`);
      //res.send(`corp_code: ${corpCode}`);
    } else {
      res.status(404).send('해당 corp_name을 찾을 수 없습니다.');
    }
  });
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})