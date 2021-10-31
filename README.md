# EYEditor

Heads-up Text Editing Tool using Voice and Manual Input (via ring mouse)

## Publications
- [EYEditor: Towards On-the-Go Heads-Up Text Editing Using Voice and Manual Input](https://dl.acm.org/doi/abs/10.1145/3313831.3376173), CHI'20
```
@inproceedings{ghosh_eyeditor_2020,
	author = {Ghosh, Debjyoti and Foong, Pin Sym and Zhao, Shengdong and Liu, Can and Janaka, Nuwan and Erusu, Vinitha},
	title = {EYEditor: Towards On-the-Go Heads-Up Text Editing Using Voice and Manual Input},
	year = {2020},
	isbn = {9781450367080},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3313831.3376173},
	doi = {10.1145/3313831.3376173},
	booktitle = {Proceedings of the 2020 CHI Conference on Human Factors in Computing Systems},
	pages = {1–13},
	numpages = {13},
	keywords = {heads-up interaction, voice interaction, smart glass, re-speaking, wearable interaction, text editing, eyeditor, mobile interaction, manual-input},
	location = {Honolulu, HI, USA},
	series = {CHI '20}
}

```

## Contact person
- [Debjyoti Ghosh](https://www.nus-hci.org/team/debjyoti-ghosh/)

## Project links
- See the interactions at [YouTube](https://www.youtube.com/watch?v=b0n5h_ZILhA)
- See [Deb's code introduction](https://drive.google.com/drive/folders/1gnJKweFS3Vq93m33DjbudaqmZ3gozW9z)
- [Project](https://drive.google.com/drive/folders/1ic9ttecpmipWBaCo6UaJNqp1tn2m99PT)

## Installation
- Install packages and dependecies: `npm install` (if some packages are missing install them also `npm install <package_name>`)
- Run: `npm start`
- Open (Google Chrome) browser at [http://localhost:3000/](http://localhost:3000/)

## Requirements
- Need active internet connection for live transcription
- Install the Vuzix Blade with [HeadsUpGlass -> eyeditor_1 branch](https://github.com/NUS-HCILab/HeadsUpGlass) OR [NIPGlass -> eyeditor_1 branch](https://github.com/NUS-HCILab/NIPGlass/tree/feature/eyeditor_1). And set up the Blade's IP address at `public/javascripts/Drivers/ConnectBlade.js`
- Configrue the ring mouse as ![attached image](https://github.com/NUS-HCILab/eyeditor/blob/dev/ring-mouse-mapping.jpeg)


