import { By, Builder, Browser } from 'selenium-webdriver'
import z from 'zod'

export {}

const driver = await new Builder().forBrowser(Browser.CHROME).build()

await driver.manage().setTimeouts({implicit: 500});

try {
    const baseUrl = 'https://www.trilhoperdido.com/listaInscritos/XI-trilhos-noturnos-dos-templarios'
    
    enum Group {
        SEM = 'Sem escalão',
        SUB18_F = 'Sub18 F',
        SUB18_M = 'Sub18 M',
        SUB20_F = 'Sub20 F',
        SUB20_M = 'Sub20 M',
        SUB23_F = 'Sub23 F',
        SUB23_M = 'Sub23 M',
        SEN_F = 'Seniores F',
        SEN_M = 'Seniores M',
        VET35_F = 'Veteranas F35',
        VET35_M = 'Veteranos M35',
        VET40_F = 'Veteranas F40',
        VET40_M = 'Veteranos M40',
        VET45_F = 'Veteranas F45',
        VET45_M = 'Veteranos M45',
        VET50_F = 'Veteranas F50',
        VET50_M = 'Veteranos M50',
        VET55_F = 'Veteranas F55',
        VET55_M = 'Veteranos M55',
        VET60_F = 'Veteranas F60',
        VET60_M = 'Veteranos M60',
        VET65_F = 'Veteranas F65',
        VET65_M = 'Veteranos M65',
        VET70_F = 'Veteranas F70',
        VET70_M = 'Veteranos M70',
        VET75_F = 'Veteranas F75',
        VET75_M = 'Veteranos M75',
    }

    enum Race {
        WALK = 'Caminhada',
        MINI_TRAIL = 'Mini Trail',
        SHORT_TRAIL = 'Trail Curto (Sprint)',
    }

    enum Paid {
        PAID = 'Pago',
    }

    const Runner = z.object({
        id: z.string(),
        name: z.string(),
        team: z.nullable(z.string()),
        group: z.nativeEnum(Group),
        paid: z.nativeEnum(Paid),
        race: z.nativeEnum(Race),
    })

    type Runner = z.infer<typeof Runner>

    const getRunners = async (pageNumber: number): Promise<Runner[]> => {
        console.log(`Getting runners from page ${pageNumber}.`)
        await driver.get(`${baseUrl}?pag=${pageNumber}`)
        const table = (await driver.findElement(By.id('ResultadosTable'))).findElement(By.css('tbody'))
        const rows = await table.findElements(By.css('tr'));
        return Promise.all(rows.map<Promise<Runner>>(async (r) => {
            const cells = await r.findElements(By.css('td'))
            if (cells.length !== 7) {
                throw new Error(`Got unexpected number of columns. Expected 7, got ${cells.length}.`)
            }
            return Runner.parse({
                id: await cells[1].getText(),
                name: await cells[2].getText(),
                team: await cells[3].getText(),
                group: await cells[4].getText(),
                paid: await cells[5].getText(),
                race: await cells[6].getText(),
            })
        }))
    }

    const getAllRunners = async (pageNumber: number = 1): Promise<Runner[]> => {
        if (pageNumber <= 0) {
            throw new Error(`Can't get runners for negative or nill page number ${pageNumber}.`)
        }
        if (!Number.isInteger(pageNumber)) {
            throw new Error(`Can't get runners for non-integer page number ${pageNumber}.`)
        }
        try {
            const runners = await getRunners(pageNumber)
            if (runners.length === 0) {
                throw new Error(`Didn't get any runners for page number ${pageNumber}.`)
            }
            return [
                ...runners,
                ...await getAllRunners(pageNumber + 1),
            ]
        } catch (e) {
            console.error(e)
            return []
        }
    }

    const runners = await getAllRunners()

    // All runners
    console.log(`Total number of runners: ${runners.length}`)
    const genderLabel = {
        M: 'male',
        F: 'female',
        Sem: 'unspecified gender',
    }
    for (const genderLabelDiscriminator of Object.keys(genderLabel) as (keyof typeof genderLabel)[]) {
        // Runners per gender
        console.log(`Total number of ${genderLabel[genderLabelDiscriminator]} runners: ${runners.filter(r => r.group.includes(genderLabelDiscriminator)).length}`)
    }
    for (const race in Race) {
        // Runners per race
        console.log(`Total number of runners competing in ${race}: ${runners.filter(r => r.race === Race[race as keyof typeof Race]).length}`)
        for (const group in Group) {
            // Runners per race, demographic group
            console.log(`Total number of runners competing in ${race} - ${group}: ${runners.filter(r => r.race === Race[race as keyof typeof Race] && r.group === Group[group as keyof typeof Group]).length}`)
        }
    }
} finally {
    await driver.quit()
}