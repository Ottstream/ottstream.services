const moment = require('moment-timezone');
const logger = require('../../utils/logger/logger');

const rawString =
  'ALB,AL,Albania,sqi,sq,Albanian,yyyy-MM-dd\n' +
  'ARE,AE,United Arab Emirates,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ARG,AR,Argentina,spa,es,Spanish,dd/MM/yyyy\n' +
  'AUS,AU,Australia,eng,en,English,d/MM/yyyy\n' +
  'AUT,AT,Austria,deu,de,German,dd.MM.yyyy\n' +
  'BEL,BE,Belgium,fra,fr,French,d/MM/yyyy\n' +
  'BEL,BE,Belgium,nld,nl,Dutch,d/MM/yyyy\n' +
  'BGR,BG,Bulgaria,bul,bg,Bulgarian,yyyy-M-d\n' +
  'BHR,BH,Bahrain,ara,ar,Arabic,dd/MM/yyyy\n' +
  'BIH,BA,Bosnia and Herzegovina,srp,sr,Serbian,yyyy-MM-dd\n' +
  'BLR,BY,Belarus,bel,be,Belarusian,d.M.yyyy\n' +
  'BOL,BO,Bolivia,spa,es,Spanish,dd-MM-yyyy\n' +
  'BRA,BR,Brazil,por,pt,Portuguese,dd/MM/yyyy\n' +
  'CAN,CA,Canada,fra,fr,French,yyyy-MM-dd\n' +
  'CAN,CA,Canada,eng,en,English,dd/MM/yyyy\n' +
  'CHE,CH,Switzerland,deu,de,German,dd.MM.yyyy\n' +
  'CHE,CH,Switzerland,fra,fr,French,dd.MM.yyyy\n' +
  'CHE,CH,Switzerland,ita,it,Italian,dd.MM.yyyy\n' +
  'CHL,CL,Chile,spa,es,Spanish,dd-MM-yyyy\n' +
  'CHN,CN,China,zho,zh,Chinese,yyyy-M-d\n' +
  'COL,CO,Colombia,spa,es,Spanish,d/MM/yyyy\n' +
  'CRI,CR,Costa Rica,spa,es,Spanish,dd/MM/yyyy\n' +
  'CYP,CY,Cyprus,ell,el,Greek,dd/MM/yyyy\n' +
  'CZE,CZ,Czech Republic,ces,cs,Czech,d.M.yyyy\n' +
  'DEU,DE,Germany,deu,de,German,dd.MM.yyyy\n' +
  'DNK,DK,Denmark,dan,da,Danish,dd-MM-yyyy\n' +
  'DOM,DO,Dominican Republic,spa,es,Spanish,MM/dd/yyyy\n' +
  'DZA,DZ,Algeria,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ECU,EC,Ecuador,spa,es,Spanish,dd/MM/yyyy\n' +
  'EGY,EG,Egypt,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ESP,ES,Spain,spa,es,Spanish,d/MM/yyyy\n' +
  'ESP,ES,Spain,cat,ca,Catalan,dd/MM/yyyy\n' +
  'EST,EE,Estonia,est,et,Estonian,d.MM.yyyy\n' +
  'FIN,FI,Finland,fin,fi,Finnish,d.M.yyyy\n' +
  'FRA,FR,France,fra,fr,French,dd/MM/yyyy\n' +
  'GBR,GB,United Kingdom,eng,en,English,dd/MM/yyyy\n' +
  'GRC,GR,Greece,ell,el,Greek,d/M/yyyy\n' +
  'GTM,GT,Guatemala,spa,es,Spanish,d/MM/yyyy\n' +
  'HKG,HK,Hong Kong,zho,zh,Chinese,yyyy年M月d日\n' +
  'HND,HN,Honduras,spa,es,Spanish,MM-dd-yyyy\n' +
  'HRV,HR,Croatia,hrv,hr,Croatian,dd.MM.yyyy.\n' +
  'HUN,HU,Hungary,hun,hu,Hungarian,yyyy.MM.dd.\n' +
  'IDN,ID,Indonesia,ind,in,Indonesian,dd/MM/yyyy\n' +
  'IND,IN,India,hin,hi,Hindi,३/६/१२\n' +
  'IND,IN,India,eng,en,English,d/M/yyyy\n' +
  'IRL,IE,Ireland,gle,ga,Irish,dd/MM/yyyy\n' +
  'IRL,IE,Ireland,eng,en,English,dd/MM/yyyy\n' +
  'IRQ,IQ,Iraq,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ISL,IS,Iceland,isl,is,Icelandic,d.M.yyyy\n' +
  'ISR,IL,Israel,heb,iw,Hebrew,dd/MM/yyyy\n' +
  'ITA,IT,Italy,ita,it,Italian,dd/MM/yyyy\n' +
  'JOR,JO,Jordan,ara,ar,Arabic,dd/MM/yyyy\n' +
  'JPN,JP,Japan,jpn,ja,Japanese,yyyy/MM/dd\n' +
  'JPN,JP,Japan,jpn,ja,Japanese,H24.MM.dd\n' +
  'KOR,KR,South Korea,kor,ko,Korean,yyyy. M. d\n' +
  'KWT,KW,Kuwait,ara,ar,Arabic,dd/MM/yyyy\n' +
  'LBN,LB,Lebanon,ara,ar,Arabic,dd/MM/yyyy\n' +
  'LBY,LY,Libya,ara,ar,Arabic,dd/MM/yyyy\n' +
  'LTU,LT,Lithuania,lit,lt,Lithuanian,yyyy.M.d\n' +
  'LUX,LU,Luxembourg,fra,fr,French,dd/MM/yyyy\n' +
  'LUX,LU,Luxembourg,deu,de,German,dd.MM.yyyy\n' +
  'LVA,LV,Latvia,lav,lv,Latvian,yyyy.d.M\n' +
  'MAR,MA,Morocco,ara,ar,Arabic,dd/MM/yyyy\n' +
  'MEX,MX,Mexico,spa,es,Spanish,d/MM/yyyy\n' +
  'MKD,MK,Macedonia,mkd,mk,Macedonian,d.M.yyyy\n' +
  'MLT,MT,Malta,eng,en,English,dd/MM/yyyy\n' +
  'MLT,MT,Malta,mlt,mt,Maltese,dd/MM/yyyy\n' +
  'MNE,ME,Montenegro,srp,sr,Serbian,d.M.yyyy.\n' +
  'MYS,MY,Malaysia,msa,ms,Malay,dd/MM/yyyy\n' +
  'NIC,NI,Nicaragua,spa,es,Spanish,MM-dd-yyyy\n' +
  'NLD,NL,Netherlands,nld,nl,Dutch,d-M-yyyy\n' +
  'NOR,NO,Norway,nor,no,Norwegian,dd.MM.yyyy\n' +
  'NOR,NO,Norway,nor,no,Norwegian,dd.MM.yyyy\n' +
  'NZL,NZ,New Zealand,eng,en,English,d/MM/yyyy\n' +
  'OMN,OM,Oman,ara,ar,Arabic,dd/MM/yyyy\n' +
  'PAN,PA,Panama,spa,es,Spanish,MM/dd/yyyy\n' +
  'PER,PE,Peru,spa,es,Spanish,dd/MM/yyyy\n' +
  'PHL,PH,Philippines,eng,en,English,M/d/yyyy\n' +
  'POL,PL,Poland,pol,pl,Polish,dd.MM.yyyy\n' +
  'PRI,PR,Puerto Rico,spa,es,Spanish,MM-dd-yyyy\n' +
  'PRT,PT,Portugal,por,pt,Portuguese,dd-MM-yyyy\n' +
  'PRY,PY,Paraguay,spa,es,Spanish,dd/MM/yyyy\n' +
  'QAT,QA,Qatar,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ROU,RO,Romania,ron,ro,Romanian,dd.MM.yyyy\n' +
  'RUS,RU,Russia,rus,ru,Russian,dd.MM.yyyy\n' +
  'SAU,SA,Saudi Arabia,ara,ar,Arabic,dd/MM/yyyy\n' +
  'SCG,CS,Serbia and Montenegro,srp,sr,Serbian,d.M.yyyy.\n' +
  'SDN,SD,Sudan,ara,ar,Arabic,dd/MM/yyyy\n' +
  'SGP,SG,Singapore,zho,zh,Chinese,dd/MM/yyyy\n' +
  'SGP,SG,Singapore,eng,en,English,M/d/yyyy\n' +
  'SLV,SV,El Salvador,spa,es,Spanish,MM-dd-yyyy\n' +
  'SRB,RS,Serbia,srp,sr,Serbian,d.M.yyyy.\n' +
  'SVK,SK,Slovakia,slk,sk,Slovak,d.M.yyyy\n' +
  'SVN,SI,Slovenia,slv,sl,Slovenian,d.M.yyyy\n' +
  'SWE,SE,Sweden,swe,sv,Swedish,yyyy-MM-dd\n' +
  'SYR,SY,Syria,ara,ar,Arabic,dd/MM/yyyy\n' +
  'THA,TH,Thailand,tha,th,Thai,d/M/2555\n' +
  'THA,TH,Thailand,tha,th,Thai,๓/๖/๒๕๕๕\n' +
  'TUN,TN,Tunisia,ara,ar,Arabic,dd/MM/yyyy\n' +
  'TUR,TR,Turkey,tur,tr,Turkish,dd.MM.yyyy\n' +
  'TWN,TW,Taiwan,zho,zh,Chinese,yyyy/M/d\n' +
  'UKR,UA,Ukraine,ukr,uk,Ukrainian,dd.MM.yyyy\n' +
  'URY,UY,Uruguay,spa,es,Spanish,dd/MM/yyyy\n' +
  'USA,US,United States,eng,en,English,M/d/yyyy\n' +
  'USA,US,United States,spa,es,Spanish,M/d/yyyy\n' +
  'VEN,VE,Venezuela,spa,es,Spanish,dd/MM/yyyy\n' +
  'VNM,VN,Vietnam,vie,vi,Vietnamese,dd/MM/yyyy\n' +
  'YEM,YE,Yemen,ara,ar,Arabic,dd/MM/yyyy\n' +
  'ZAF,ZA,South Africa,eng,en,English,yyyy/MM/dd';

const countryFormats = {};
const rows = rawString.split('\n');
rows.forEach((row) => {
  const columns = row.split(',');
  if (columns.length >= 2) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < columns.length - 2; i++) {
      countryFormats[columns[i].toLowerCase()] = columns[columns.length - 1];
    }
  }
});

const timezoneRawString =
  'ET\n' +
  '\n' +
  '(UTC-05:00) Eastern Time (US & Canada)\n' +
  '\n' +
  'US/Eastern\n' +
  '\n' +
  'America/New York\n' +
  '\n' +
  'Eastern Standard Time\n' +
  '\n' +
  'CT\n' +
  '\n' +
  '(UTC-06:00) Central Time (US & Canada)\n' +
  '\n' +
  'US/Central\n' +
  '\n' +
  'America/Chicago\n' +
  '\n' +
  'Central Standard Time\n' +
  '\n' +
  'MT\n' +
  '\n' +
  '(UTC-07:00) Mountain Time (US & Canada)\n' +
  '\n' +
  'US/Mountain\n' +
  '\n' +
  'America/Denver\n' +
  '\n' +
  'Mountain Standard Time\n' +
  '\n' +
  'PT\n' +
  '\n' +
  '(UTC-08:00) Pacific Time (US & Canada)\n' +
  '\n' +
  'US/Pacific\n' +
  '\n' +
  'America/Los Angeles\n' +
  '\n' +
  'Pacific Standard Time\n' +
  '\n' +
  'AK\n' +
  '\n' +
  '(UTC-09:00) Alaska\n' +
  '\n' +
  'America/Anchorage\n' +
  '\n' +
  'America/Anchorage\n' +
  '\n' +
  'Alaskan Standard Time\n' +
  '\n' +
  'HAST\n' +
  '\n' +
  '(UTC-10:00) Hawaii\n' +
  '\n' +
  'Pacific/Honolulu\n' +
  '\n' +
  'Pacific/Honolulu\n' +
  '\n' +
  'Hawaiian Standard Time\n' +
  '\n' +
  'MST\n' +
  '\n' +
  '(UTC-07:00) Arizona\n' +
  '\n' +
  'US/Arizona\n' +
  '\n' +
  'America/Phoenix\n' +
  '\n' +
  'Mountain Standard Time\n' +
  '\n' +
  'AST\n' +
  '\n' +
  '(UTC-04:00) Atlantic Time (Canada)\n' +
  '\n' +
  'Canada/Atlantic\n' +
  '\n' +
  'America/Aruba\n' +
  '\n' +
  'Atlantic Standard Time\n' +
  '\n' +
  'MOST\n' +
  '\n' +
  '(UTC) Casablanca\n' +
  '\n' +
  'Africa/Casablanca\n' +
  '\n' +
  'Africa/Casablanca\n' +
  '\n' +
  'Morocco Standard Time\n' +
  '\n' +
  'UTC\n' +
  '\n' +
  '(UTC) Coordinated Universal Time\n' +
  '\n' +
  'UTC\n' +
  '\n' +
  'Etc/GMT+0\n' +
  '\n' +
  'UTC\n' +
  '\n' +
  'GMT\n' +
  '\n' +
  '(UTC) Dublin, Edinburgh, Lisbon, London\n' +
  '\n' +
  'Europe/London\n' +
  '\n' +
  'Europe/London\n' +
  '\n' +
  'GMT Standard Time\n' +
  '\n' +
  'GST\n' +
  '\n' +
  '(UTC) Monrovia, Reykjavik\n' +
  '\n' +
  'Africa/Casablanca\n' +
  '\n' +
  'Africa/Casablanca\n' +
  '\n' +
  'Greenwich Standard Time\n' +
  '\n' +
  'WET\n' +
  '\n' +
  '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna\n' +
  '\n' +
  'Europe/Amsterdam\n' +
  '\n' +
  'Europe/Amsterdam\n' +
  '\n' +
  'West Europe Standard Time\n' +
  '\n' +
  'CET\n' +
  '\n' +
  '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague\n' +
  '\n' +
  'Europe/Belgrade\n' +
  '\n' +
  'Europe/Belgrade\n' +
  '\n' +
  'Central Europe Standard Time\n' +
  '\n' +
  'RST\n' +
  '\n' +
  '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris\n' +
  '\n' +
  'Europe/Brussels\n' +
  '\n' +
  'Europe/Copenhagen\n' +
  '\n' +
  'Romance Standard Time\n' +
  '\n' +
  'CEST\n' +
  '\n' +
  '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb\n' +
  '\n' +
  'Europe/Sarajevo\n' +
  '\n' +
  'Europe/Sarajevo\n' +
  '\n' +
  'Central European Standard Time\n' +
  '\n' +
  'ECT\n' +
  '\n' +
  '(UTC+01:00) West Central Africa\n' +
  '\n' +
  'Africa/Brazzaville\n' +
  '\n' +
  'Africa/Douala\n' +
  '\n' +
  'W. Central Africa Standard Time\n' +
  '\n' +
  'JST\n' +
  '\n' +
  '(UTC+02:00) Amman\n' +
  '\n' +
  'Europe/Athens\n' +
  '\n' +
  'Europe/Bucharest\n' +
  '\n' +
  'Jordan Standard Time\n' +
  '\n' +
  'GTBST\n' +
  '\n' +
  '(UTC+02:00) Athens, Bucharest, Istanbul\n' +
  '\n' +
  'Europe/Athens\n' +
  '\n' +
  'Europe/Bucharest\n' +
  '\n' +
  'GTB Standard Time\n' +
  '\n' +
  'MEST\n' +
  '\n' +
  'MEST (UTC+02:00) Beirut\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Middle East Standard Time\n' +
  '\n' +
  'EGST\n' +
  '\n' +
  'EGST (UTC+02:00) Cairo\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Egypt Standard Time\n' +
  '\n' +
  'SST\n' +
  '\n' +
  '(UTC+02:00) Damascus\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Africa/Cairo\n' +
  '\n' +
  'Syria Standard Time\n' +
  '\n' +
  'SAST\n' +
  '\n' +
  '(UTC+02:00) Harare, Pretoria\n' +
  '\n' +
  'Africa/Harare\n' +
  '\n' +
  'Africa/Harare\n' +
  '\n' +
  'South Africa Standard Time\n' +
  '\n' +
  'EET\n' +
  '\n' +
  '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius\n' +
  '\n' +
  'Europe/Helsinki\n' +
  '\n' +
  'Europe/Helsinki\n' +
  '\n' +
  'FLE Standard Time\n' +
  '\n' +
  'ISST\n' +
  '\n' +
  '(UTC+02:00) Jerusalem\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'Israel Standard Time\n' +
  '\n' +
  'EEST\n' +
  '\n' +
  '(UTC+02:00) Minsk\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'E. Europe Standard Time\n' +
  '\n' +
  'NMST\n' +
  '\n' +
  '(UTC+02:00) Windhoek\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'Asia/Jerusalem\n' +
  '\n' +
  'Namibia Standard Time\n' +
  '\n' +
  'ARST\n' +
  '\n' +
  '(UTC+03:00) Baghdad\n' +
  '\n' +
  'Asia/Baghdad\n' +
  '\n' +
  'Asia/Baghdad\n' +
  '\n' +
  'Arabic Standard Time\n' +
  '\n' +
  'ABST\n' +
  '\n' +
  '(UTC+03:00) Kuwait, Riyadh\n' +
  '\n' +
  'Asia/Kuwait\n' +
  '\n' +
  'Asia/Kuwait\n' +
  '\n' +
  'Arab Standard Time\n' +
  '\n' +
  'MSK\n' +
  '\n' +
  '(UTC+03:00) Moscow, St. Petersburg, Volgograd\n' +
  '\n' +
  'Europe/Moscow\n' +
  '\n' +
  'Europe/Moscow\n' +
  '\n' +
  'Russian Standard Time\n' +
  '\n' +
  'EAT\n' +
  '\n' +
  '(UTC+03:00) Nairobi\n' +
  '\n' +
  'Asia/Kuwait\n' +
  '\n' +
  'Asia/Kuwait\n' +
  '\n' +
  'E. Africa Standard Time\n' +
  '\n' +
  'IRST\n' +
  '\n' +
  '(UTC+03:30) Tehran\n' +
  '\n' +
  'Asia/Tehran\n' +
  '\n' +
  'Asia/Tehran\n' +
  '\n' +
  'Iran Standard Time\n' +
  '\n' +
  'ARBST\n' +
  '\n' +
  '(UTC+04:00) Abu Dhabi, Muscat\n' +
  '\n' +
  'Asia/Muscat\n' +
  '\n' +
  'Asia/Muscat\n' +
  '\n' +
  'Arabian Standard Time\n' +
  '\n' +
  'AZT\n' +
  '\n' +
  '(UTC+04:00) Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Azerbaijan Standard Time\n' +
  '\n' +
  'MUT\n' +
  '\n' +
  '(UTC+04:00) Port Louis\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Mauritius Standard Time\n' +
  '\n' +
  'GET\n' +
  '\n' +
  '(UTC+04:00) Tbilisi\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Georgian Standard Time\n' +
  '\n' +
  'AMT\n' +
  '\n' +
  '(UTC+04:00) Yerevan\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Caucasus Standard Time\n' +
  '\n' +
  'AFT\n' +
  '\n' +
  '(UTC+04:30) Kabul\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Asia/Baku\n' +
  '\n' +
  'Afghanistan Standard Time\n' +
  '\n' +
  'YEKT\n' +
  '\n' +
  '(UTC+05:00) Ekaterinburg\n' +
  '\n' +
  'Asia/Tashkent\n' +
  '\n' +
  'Asia/Yekaterinburg\n' +
  '\n' +
  'Ekaterinburg Standard Time\n' +
  '\n' +
  'PKT\n' +
  '\n' +
  '(UTC+05:00) Islamabad, Karachi\n' +
  '\n' +
  'Asia/Tashkent\n' +
  '\n' +
  'Asia/Karachi\n' +
  '\n' +
  'Pakistan Standard Time\n' +
  '\n' +
  'WAST\n' +
  '\n' +
  '(UTC+05:00) Tashkent\n' +
  '\n' +
  'Asia/Tashkent\n' +
  '\n' +
  'Asia/Yekaterinburg\n' +
  '\n' +
  'West Asia Standard Time\n' +
  '\n' +
  'IST\n' +
  '\n' +
  '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi\n' +
  '\n' +
  'Asia/Calcutta\n' +
  '\n' +
  'Asia/Calcutta\n' +
  '\n' +
  'India Standard Time\n' +
  '\n' +
  'SLT\n' +
  '\n' +
  '(UTC+05:30) Sri Jayawardenepura\n' +
  '\n' +
  'Asia/Calcutta\n' +
  '\n' +
  'Asia/Calcutta\n' +
  '\n' +
  'Sri Lanka Standard Time\n' +
  '\n' +
  'NPT\n' +
  '\n' +
  '(UTC+05:45) Kathmandu\n' +
  '\n' +
  'Asia/Katmandu\n' +
  '\n' +
  'Asia/Katmandu\n' +
  '\n' +
  'Nepal Standard Time\n' +
  '\n' +
  'BTT\n' +
  '\n' +
  '(UTC+06:00) Astana\n' +
  '\n' +
  'Asia/Dhaka\n' +
  '\n' +
  'Asia/Dhaka\n' +
  '\n' +
  'Central Asia Standard Time\n' +
  '\n' +
  'BST\n' +
  '\n' +
  '(UTC+06:00) Dhaka\n' +
  '\n' +
  'Asia/Dhaka\n' +
  '\n' +
  'Asia/Dhaka\n' +
  '\n' +
  'Bangladesh Standard Time\n' +
  '\n' +
  'NCAST\n' +
  '\n' +
  '(UTC+06:00) Novosibirsk\n' +
  '\n' +
  'Asia/Almaty\n' +
  '\n' +
  'Asia/Dhaka\n' +
  '\n' +
  'N. Central Asia Standard Time\n' +
  '\n' +
  'MYST\n' +
  '\n' +
  '(UTC+06:30) Yangon (Rangoon)\n' +
  '\n' +
  'Asia/Rangoon\n' +
  '\n' +
  'Asia/Rangoon\n' +
  '\n' +
  'Myanmar Standard Time\n' +
  '\n' +
  'THA\n' +
  '\n' +
  '(UTC+07:00) Bangkok, Hanoi, Jakarta\n' +
  '\n' +
  'Asia/Bangkok\n' +
  '\n' +
  'Asia/Bangkok\n' +
  '\n' +
  'SE Asia Standard Time\n' +
  '\n' +
  'KRAT\n' +
  '\n' +
  '(UTC+07:00) Krasnoyarsk\n' +
  '\n' +
  'Asia/Bangkok\n' +
  '\n' +
  'Asia/Bangkok\n' +
  '\n' +
  'North Asia Standard Time\n' +
  '\n' +
  ' \n' +
  '\n' +
  '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi\n' +
  '\n' +
  'Asia/Hong Kong\n' +
  '\n' +
  'Asia/Hong Kong\n' +
  '\n' +
  'China Standard Time\n' +
  '\n' +
  'IRKT\n' +
  '\n' +
  '(UTC+08:00) Irkutsk\n' +
  '\n' +
  'Asia/Irkutsk\n' +
  '\n' +
  'Asia/Irkutsk\n' +
  '\n' +
  'North Asia East Standard Time\n' +
  '\n' +
  'SNST\n' +
  '\n' +
  '(UTC+08:00) Kuala Lumpur, Singapore\n' +
  '\n' +
  'Asia/Singapore\n' +
  '\n' +
  'Asia/Taipei\n' +
  '\n' +
  'Singapore Standard Time\n' +
  '\n' +
  'AWST\n' +
  '\n' +
  '(UTC+08:00) Perth\n' +
  '\n' +
  'Australia/Perth\n' +
  '\n' +
  'Australia/Perth\n' +
  '\n' +
  'W. Australia Standard Time\n' +
  '\n' +
  'TIST\n' +
  '\n' +
  '(UTC+08:00) Taipei\n' +
  '\n' +
  'Asia/Taipei\n' +
  '\n' +
  'Asia/Taipei\n' +
  '\n' +
  'Taipei Standard Time\n' +
  '\n' +
  'UST\n' +
  '\n' +
  '(UTC+08:00) Ulaanbaatar\n' +
  '\n' +
  'Asia/Taipei\n' +
  '\n' +
  'Asia/Taipei\n' +
  '\n' +
  'Ulaanbaatar Standard Time\n' +
  '\n' +
  'TST\n' +
  '\n' +
  '(UTC+09:00) Osaka, Sapporo, Tokyo\n' +
  '\n' +
  'Asia/Tokyo\n' +
  '\n' +
  'Asia/Tokyo\n' +
  '\n' +
  'Tokyo Standard Time\n' +
  '\n' +
  'KST\n' +
  '\n' +
  '(UTC+09:00) Seoul\n' +
  '\n' +
  'Asia/Seoul\n' +
  '\n' +
  'Asia/Seoul\n' +
  '\n' +
  'Korea Standard Time\n' +
  '\n' +
  'YAKT\n' +
  '\n' +
  '(UTC+09:00) Yakutsk\n' +
  '\n' +
  'Asia/Yakutsk\n' +
  '\n' +
  'Asia/Yakutsk\n' +
  '\n' +
  'Yakutsk Standard Time\n' +
  '\n' +
  'CAUST\n' +
  '\n' +
  '(UTC+09:30) Adelaide\n' +
  '\n' +
  'Australia/Adelaide\n' +
  '\n' +
  'Australia/Adelaide\n' +
  '\n' +
  'Cen. Australia Standard Time\n' +
  '\n' +
  'ACST\n' +
  '\n' +
  '(UTC+09:30) Darwin\n' +
  '\n' +
  'Australia/Darwin\n' +
  '\n' +
  'Australia/Darwin\n' +
  '\n' +
  'AUS Central Standard Time\n' +
  '\n' +
  'EAST\n' +
  '\n' +
  '(UTC+10:00) Brisbane\n' +
  '\n' +
  'Australia/Brisbane\n' +
  '\n' +
  'Australia/Brisbane\n' +
  '\n' +
  'E. Australia Standard Time\n' +
  '\n' +
  'AEST\n' +
  '\n' +
  '(UTC+10:00) Canberra, Melbourne, Sydney\n' +
  '\n' +
  'Australia/Sydney\n' +
  '\n' +
  'Australia/Sydney\n' +
  '\n' +
  'AUS Eastern Standard Time\n' +
  '\n' +
  'WPST\n' +
  '\n' +
  '(UTC+10:00) Guam, Port Moresby\n' +
  '\n' +
  'Pacific/Guam\n' +
  '\n' +
  'Pacific/Guam\n' +
  '\n' +
  'West Pacific Standard Time\n' +
  '\n' +
  'TAST\n' +
  '\n' +
  '(UTC+10:00) Hobart\n' +
  '\n' +
  'Australia/Hobart\n' +
  '\n' +
  'Australia/Hobart\n' +
  '\n' +
  'Tasmania Standard Time\n' +
  '\n' +
  'VLAT\n' +
  '\n' +
  '(UTC+10:00) Vladivostok\n' +
  '\n' +
  'Asia/Vladivostok\n' +
  '\n' +
  'Asia/Vladivostok\n' +
  '\n' +
  'Vladivostok Standard Time\n' +
  '\n' +
  'SBT\n' +
  '\n' +
  '(UTC+11:00) Magadan, Solomon Is., New Caledonia\n' +
  '\n' +
  'Pacific/Guadalcanal\n' +
  '\n' +
  'Pacific/Guadalcanal\n' +
  '\n' +
  'Central Pacific Standard Time\n' +
  '\n' +
  'NZST\n' +
  '\n' +
  '(UTC+12:00) Auckland, Wellington\n' +
  '\n' +
  'Pacific/Auckland\n' +
  '\n' +
  'Pacific/Auckland\n' +
  '\n' +
  'New Zealand Standard Time\n' +
  '\n' +
  'UTC12\n' +
  '\n' +
  '(UTC+12:00) Coordinated Universal Time+12\n' +
  '\n' +
  'Etc/GMT-12\n' +
  '\n' +
  'Etc/GMT-12\n' +
  '\n' +
  'UTC+12\n' +
  '\n' +
  'FJT\n' +
  '\n' +
  '(UTC+12:00) Fiji\n' +
  '\n' +
  'Pacific/Fiji\n' +
  '\n' +
  'Pacific/Fiji\n' +
  '\n' +
  'Fiji Standard Time\n' +
  '\n' +
  'PETT\n' +
  '\n' +
  '(UTC+12:00) Petropavlovsk-Kamchatsky - Old\n' +
  '\n' +
  'Asia/Kamchatka\n' +
  '\n' +
  'Etc/GMT+12\n' +
  '\n' +
  'Kamchatka Standard Time\n' +
  '\n' +
  'PHOT\n' +
  '\n' +
  "(UTC+13:00) Nuku'alofa\n" +
  '\n' +
  'Pacific/Tongatapu\n' +
  '\n' +
  'Pacific/Tongatapu\n' +
  '\n' +
  'Tonga Standard Time\n' +
  '\n' +
  'AZOST\n' +
  '\n' +
  '(UTC-01:00) Azores\n' +
  '\n' +
  'Atlantic/Azores\n' +
  '\n' +
  'Atlantic/Azores\n' +
  '\n' +
  'Azores Standard Time\n' +
  '\n' +
  'CVT\n' +
  '\n' +
  '(UTC-01:00) Cape Verde Is.\n' +
  '\n' +
  'Atlantic/Cape Verde\n' +
  '\n' +
  'Atlantic/Cape Verde\n' +
  '\n' +
  'Cape Verde Standard Time\n' +
  '\n' +
  'ESAST\n' +
  '\n' +
  '(UTC-03:00) Brasilia America/Sao_Paulo\n' +
  '\n' +
  'America/Sao_Paulo\n' +
  '\n' +
  'America/Sao_Paulo\n' +
  '\n' +
  'E. South America Standard Time\n' +
  '\n' +
  'ART\n' +
  '\n' +
  '(UTC-03:00) Buenos Aires\n' +
  '\n' +
  'America/Buenos Aires\n' +
  '\n' +
  'America/Buenos Aires\n' +
  '\n' +
  'Argentina Standard Time\n' +
  '\n' +
  'SAEST\n' +
  '\n' +
  '(UTC-03:00) Cayenne, Fortaleza\n' +
  '\n' +
  'SA Eastern Standard Time\n' +
  '\n' +
  'SA Eastern Standard Time\n' +
  '\n' +
  'SA Eastern Standard Time\n' +
  '\n' +
  'GNST\n' +
  '\n' +
  '(UTC-03:00) Greenland\n' +
  '\n' +
  'America/Godthab\n' +
  '\n' +
  'America/Godthab\n' +
  '\n' +
  'Greenland Standard Time\n' +
  '\n' +
  'MVST\n' +
  '\n' +
  '(UTC-03:00) Montevideo\n' +
  '\n' +
  'America/Godthab\n' +
  '\n' +
  'America/Montevideo\n' +
  '\n' +
  'Montevideo Standard Time\n' +
  '\n' +
  'NST\n' +
  '\n' +
  '(UTC-03:30) Newfoundland\n' +
  '\n' +
  'Canada/Newfoundland\n' +
  '\n' +
  'Canada/Newfoundland\n' +
  '\n' +
  'Newfoundland Standard Time\n' +
  '\n' +
  'PRST\n' +
  '\n' +
  '(UTC-04:00) Asuncion\n' +
  '\n' +
  'Canada/Atlantic\n' +
  '\n' +
  'America/Aruba\n' +
  '\n' +
  'Paraguay Standard Time\n' +
  '\n' +
  'CBST\n' +
  '\n' +
  '(UTC-04:00) Cuiaba\n' +
  '\n' +
  'Canada/Atlantic\n' +
  '\n' +
  'America/Aruba\n' +
  '\n' +
  'Central Brazilian Standard Time\n' +
  '\n' +
  'SAWST\n' +
  '\n' +
  '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan\n' +
  '\n' +
  'America/Santiago\n' +
  '\n' +
  'America/Santiago\n' +
  '\n' +
  'SA Western Standard Time\n' +
  '\n' +
  'PSAST\n' +
  '\n' +
  '(UTC-04:00) Santiago\n' +
  '\n' +
  'America/Santiago\n' +
  '\n' +
  'America/Santiago\n' +
  '\n' +
  'Pacific SA Standard Time\n' +
  '\n' +
  'VST\n' +
  '\n' +
  '(UTC-04:30) Caracas\n' +
  '\n' +
  'America/Caracas\n' +
  '\n' +
  'America/Caracas\n' +
  '\n' +
  'Venezuela Standard Time\n' +
  '\n' +
  'SAPST\n' +
  '\n' +
  '(UTC-05:00) Bogota, Lima, Quito\n' +
  '\n' +
  'America/Bogota\n' +
  '\n' +
  'America/Bogota\n' +
  '\n' +
  'SA Pacific Standard Time\n' +
  '\n' +
  'EST\n' +
  '\n' +
  '(UTC-05:00) Indiana (East)\n' +
  '\n' +
  'US/East-Indiana\n' +
  '\n' +
  'America/Halifax\n' +
  '\n' +
  'US Eastern Standard Time\n' +
  '\n' +
  'CAST\n' +
  '\n' +
  '(UTC-06:00) Central America\n' +
  '\n' +
  'America/El_Salvador\n' +
  '\n' +
  'America/Mexico_City\n' +
  '\n' +
  'Central America Standard Time\n' +
  '\n' +
  'CST\n' +
  '\n' +
  '(UTC-06:00) Guadalajara, Mexico City, Monterrey\n' +
  '\n' +
  'America/Mexico_City\n' +
  '\n' +
  'America/Mexico_City\n' +
  '\n' +
  'Central Standard Time (Mexico)\n' +
  '\n' +
  'CCST\n' +
  '\n' +
  '(UTC-06:00) Saskatchewan\n' +
  '\n' +
  'Canada/Saskatchewan\n' +
  '\n' +
  'Canada/Saskatchewan\n' +
  '\n' +
  'Canada Central Standard Time\n' +
  '\n' +
  'MSTM\n' +
  '\n' +
  '(UTC-07:00) Chihuahua, La Paz, Mazatlan\n' +
  '\n' +
  'America/Chihuahua\n' +
  '\n' +
  'America/Mazatlan\n' +
  '\n' +
  'Mountain Standard Time (Mexico)\n' +
  '\n' +
  'PST\n' +
  '\n' +
  '(UTC-08:00) Baja California\n' +
  '\n' +
  'US/Pacific\n' +
  '\n' +
  'America/Los Angeles\n' +
  '\n' +
  'Pacific Standard Time (Mexico)\n' +
  '\n' +
  'SMST\n' +
  '\n' +
  '(UTC-11:00) Samoa\n' +
  '\n' +
  'Pacific/Midway\n' +
  '\n' +
  'Pacific/Midway\n' +
  '\n' +
  'Samoa Standard Time\n' +
  '\n' +
  'BIT\n' +
  '\n' +
  '(UTC-12:00) International Date Line West\n' +
  '\n' +
  'Etc/GMT+12\n' +
  '\n' +
  'Etc/GMT+12\n' +
  '\n' +
  'Dateline Standard Time';

const timezoneSplited = timezoneRawString.split('\n\n');
const timeZoneNamesObject = {};
if (timezoneSplited.length % 5 === 0) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < timezoneSplited.length; i++) {
    if ((i + 1) % 5 === 0) {
      timeZoneNamesObject[timezoneSplited[i]] = timezoneSplited[i - 1];
    }
  }
}

class TimezoneService {
  constructor() {
    logger.info(`TimezoneService() initiated`);
  }

  static NewUTCDate() {
    // const localDate = new Date();
    // const localMoment = moment();
    const utcMoment = moment.utc();
    return new Date(utcMoment.format());
  }

  static ConvertToUserLocal(date, user) {
    const timezone = user?.provider?.timezone;
    if (timezone && timezone !== '') {
      const utcCutoff = moment.utc(date);
      logger.info(date);
      const displayCutoff = utcCutoff.clone().tz(timezone);
      return displayCutoff.toDate();
    }
    return Date;
  }

  static GetTimeZoneFromWindowsName(windowsName) {
    return timeZoneNamesObject[windowsName];
  }

  static changeTimezone(date, ianatz) {
    // suppose the date is 12:00 UTC
    const invdate = new Date(
      date.toLocaleString('en-US', {
        timeZone: ianatz,
      })
    );

    // then invdate will be 07:00 in Toronto
    // and the diff is 5 hours
    const diff = date.getTime() - invdate.getTime();

    // so 12:00 in Toronto is 17:00 UTC
    return new Date(date.getTime() - diff); // needs to substract
  }

  static GetCountryFormat(country) {
    let format = 'd/M/yyyy';
    let hourFormat = `HH:mm`;
    if (country) {
      const searchCountry = country.toLowerCase();
      if (searchCountry in countryFormats) {
        format = countryFormats[searchCountry];
      }
      if (country.toLowerCase() === 'us') hourFormat = `hh:mm A`;
    }
    return `${format.toUpperCase()} ${hourFormat}`;
  }

  static LocalizeDate(date, user, hardFormat) {
    const currentFormat = hardFormat || TimezoneService.GetCountryFormat(user?.provider?.country);
    if (user && user.provider && !!user.provider.timezone) {
      // const dates = TimezoneService.changeTimezone(date, "America/Toronto");
      // const a = date.toLocaleString("en-US", {
      //   timeZone: `${timezone}`
      // });
      const utcCutoff = moment.utc(date); // TODO save format minute fix (minute is incremented on formatting)
      return utcCutoff.clone().tz(user.provider.timezone).format(currentFormat);
      // date = displayCutoff.toDate();
      // return date;
    }
    return moment(date).format(currentFormat);
  }

  // eslint-disable-next-line no-unused-vars
  static LocalizeObject(obj, user, skip = {}, hardFormat = null) {
    if (!obj) return obj;
    // finalObject
    if (obj.constructor.name === 'model' || obj.constructor.name === 'EmbeddedDocument') {
      // eslint-disable-next-line no-param-reassign
      obj = obj.toJSON();
    }
    Object.keys(obj).forEach((key) => {
      if (!obj) return;
      if (obj[key]?.constructor?.name === 'model' || obj.constructor.name === 'EmbeddedDocument') {
        // eslint-disable-next-line no-param-reassign
        obj[key] = obj[key].toJSON();
      }
      // if (list.filter((r) => r === key).length) {
      if (obj[key] instanceof Date && !skip[key]) {
        // eslint-disable-next-line no-param-reassign
        obj[key] = TimezoneService.LocalizeDate(obj[key], user, hardFormat);
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        TimezoneService.LocalizeObject(obj[key], user, skip, hardFormat);
      }
    });
    return obj;
  }

  // static GetTimezoneDate(date, timezone) {
  //   return new Date();
  // }
}
// const incomingString = '30.05.2022 16:05'
// const currentCountryFormat = 'dd.MM.yyyy'.toUpperCase();
//
// const fullFormat = `${currentCountryFormat} HH:mm`;
// const momentObject = moment(incomingString, fullFormat);
// const date = momentObject.toDate();
module.exports = TimezoneService;
