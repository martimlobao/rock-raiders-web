export class FileSelectComponent {
    readonly label: HTMLLabelElement
    readonly input: HTMLInputElement

    constructor(filename: string, isDirectory: boolean = false) {
        this.label = document.createElement('label')
        this.label.innerHTML = `Select <b>${filename}</b> here:`
        this.input = this.label.appendChild(document.createElement('input'))
        this.input.classList.add('select-files-input')
        this.input.type = 'file'
        this.input.required = true

        if (isDirectory) {
            this.input.setAttribute('webkitdirectory', '')
            this.input.setAttribute('directory', '')
        } else {
            this.input.accept = `.${filename.split('.').last()}`
        }
    }
}
