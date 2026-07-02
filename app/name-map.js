// Maps engine district names -> geojson feature titles.
// Urban districts have no rural-IPC polygon; they render as circle markers.
window.HOZI_NAMEMAP = {
  polygon: {
    "Mutare":"Mutare","Chipinge":"Chipinge","Bindura":"Bindura","Mazowe":"Mazowe",
    "Marondera":"Marondera","Murehwa":"Murehwa","Hurungwe":"Hurungwe","Masvingo":"Masvingo",
    "Chiredzi":"Chiredzi","Hwange":"Hwange","Lupane":"Lupane","Gwanda":"Gwanda",
    "Beitbridge":"Beitbridge","Gweru":"Gweru","Kwekwe":"Kwekwe",
    "Chinhoyi":"Makonde" // Chinhoyi is the district town of Makonde
  },
  urban: ["Harare Urban","Chitungwiza","Bulawayo Central","Bulawayo North"]
};
