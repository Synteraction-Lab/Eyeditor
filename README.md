# EYEditor

Heads-up Text Editing Tool using Voice and Manual Input (via ring mouse)

- Install packages and dependecies: `npm install` (if some packages are missing install them also `npm install <package_name>`)

- Run: `npm start`

- Open (Google Chrome) browser at [http://localhost:3000/](http://localhost:3000/)

- Note: Need active internet connection for live transcription

- Install the Vuzix Blade with [NIPGlass -> eyeditor_1 branch](https://github.com/NUS-HCILab/NIPGlass/tree/feature/eyeditor_1). And set up the Blade's IP address at `public/javascripts/Drivers/ConnectBlade.js`

- See the interactions at [YouTube](https://www.youtube.com/watch?v=b0n5h_ZILhA)

- See the ring mouse key-mapping at the ![attached image](https://github.com/NUS-HCILab/eyeditor/blob/dev/ring-mouse-mapping.jpeg)

## Project links
- See [Deb's code introduction](https://drive.google.com/drive/folders/1gnJKweFS3Vq93m33DjbudaqmZ3gozW9z)
- [Project](https://www.nus-hci.org/portfolio/eyeditor/)

## Publications
- [EYEditor: Towards On-the-Go Heads-Up Text Editing Using Voice and Manual Input](https://dl.acm.org/doi/abs/10.1145/3313831.3376173), CHI'20
```
@inproceedings{10.1145/3313831.3376173,
	author = {Ghosh, Debjyoti and Foong, Pin Sym and Zhao, Shengdong and Liu, Can and Janaka, Nuwan and Erusu, Vinitha},
	title = {EYEditor: Towards On-the-Go Heads-Up Text Editing Using Voice and Manual Input},
	year = {2020},
	isbn = {9781450367080},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3313831.3376173},
	doi = {10.1145/3313831.3376173},
	abstract = {On-the-go text-editing is difficult, yet frequently done in everyday lives. Using smartphones for editing text forces users into a heads-down posture which can be undesirable and unsafe. We present EYEditor, a heads-up smartglass-based solution that displays the text on a see-through peripheral display and allows text-editing with voice and manual input. The choices of output modality (visual and/or audio) and content presentation were made after a controlled experiment, which showed that sentence-by-sentence visual-only presentation is best for optimizing users' editing and path-navigation capabilities. A second experiment formally evaluated EYEditor against the standard smartphone-based solution for tasks with varied editing complexities and navigation difficulties. The results showed that EYEditor outperformed smartphones as either the path OR the task became more difficult. Yet, the advantage of EYEditor became less salient when both the editing and navigation was difficult. We discuss trade-offs and insights gained for future heads-up text-editing solutions.},
	booktitle = {Proceedings of the 2020 CHI Conference on Human Factors in Computing Systems},
	pages = {1–13},
	numpages = {13},
	keywords = {heads-up interaction, voice interaction, smart glass, re-speaking, wearable interaction, text editing, eyeditor, mobile interaction, manual-input},
	location = {Honolulu, HI, USA},
	series = {CHI '20}
}

```