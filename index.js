const cheerio = require('cheerio');
const request = require('request-promise');
const fs = require('fs');

async function main() {
  const outputFile = './box-office-data.csv';
  const fileStream = fs.createWriteStream(outputFile);
  fileStream.write('title, studio, total_gross, total_gross_theaters, opening, opening_theaters, open\n');

  const alphabet = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const nonAlphabet = ['NUM'];
  const columnMap = {
    title: 1,
    studio: 2,
    total_gross: 3,
    total_gross_theaters: 4,
    opening: 5,
    opening_theaters: 6,
    open: 0
  }

  for (let letter of nonAlphabet.concat(alphabet)) {
    let pageNumExists = true;
    for (page = 1; pageNumExists; page++) {

      const url = `http://www.boxofficemojo.com/movies/alphabetical.htm?letter=${letter}&page=${page}&p=.htm`;
      console.log(`Gathering for URL ${url}...`);

      try {
        const $ = await request({
          uri: url,
          transform: function (body) {
              return cheerio.load(body);
          }
        });
        const cellSelector = '#body > div > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td > table:nth-child(5) > tbody tr td';
        const cells = $(cellSelector);

        if (cells.length <= 5 || letter === 'NUM') {
          pageNumExists = false;
        }

        cells.each((index, cell) => {
          // skip the header row
          if (index < 5) {
            return;
          }

          const typeNum = (index - 4) % 7

          switch(typeNum) {
            case columnMap.title:
              fileStream.write(`${($(cell).find('b').text()).replace(/,/g, '')}, `);
              break;
            case columnMap.studio:
            case columnMap.total_gross:
            case columnMap.total_gross_theaters:
            case columnMap.opening:
            case columnMap.opening_theaters:
              fileStream.write(`${($(cell).children('font').text()).replace(/,/g, '')}, `);
              break;
            case columnMap.open:
              const openDate = $(cell).find('a').text() || $(cell).find('font').text();
              fileStream.write(`${openDate.replace(/,/g, '')}\n`);
              break;
            default:
              console.log(`Unexpected number of cells in row for url ${url}, index ${index}, typeNum ${typeNum}`);
              break;
          }
        });
      }
      catch (error) {
        console.log(`Error occurred requesting page ${url}. ${error}`);
        pageNumExists = false;
      }
    }
  }

  fileStream.end();
  console.log(`CSV generated at path ${outputFile}`);
  process.exit();
}

main();
